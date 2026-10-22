import Order, { ORDER_STATUSES } from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// 취소된 주문은 매출에서 제외
const COUNTED_IN_REVENUE = { status: { $ne: 'cancelled' } };
const TIMEZONE = 'Asia/Seoul';
const ALLOWED_DAYS = [7, 30, 90];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// 검색어에 정규식 특수문자가 들어와도 안전하게
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 한국 시간 기준 YYYY-MM-DD
const toDateKey = (date) => date.toLocaleDateString('sv-SE', { timeZone: TIMEZONE });

async function sumRevenue(match = {}) {
  const [result] = await Order.aggregate([
    { $match: { ...COUNTED_IN_REVENUE, ...match } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  return result?.total ?? 0;
}

// 관리자 대시보드 상단 요약 숫자
export async function getStats(req, res, next) {
  try {
    const [totalOrders, totalProducts, totalCustomers, totalRevenue] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ user_type: 'customer' }),
      sumRevenue(),
    ]);
    res.json({ totalOrders, totalProducts, totalCustomers, totalRevenue });
  } catch (err) {
    next(err);
  }
}

// 주문 목록 (상태별 필터, 최신순)
export async function getOrders(req, res, next) {
  try {
    const { status } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    if (status && !ORDER_STATUSES.includes(status)) {
      throw httpError(400, '올바르지 않은 주문 상태입니다.');
    }

    const filter = status ? { status } : {};
    const [orders, statusCounts] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).limit(limit).populate('user', 'name email'),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
    statusCounts.forEach(({ _id, count }) => {
      counts[_id] = count;
    });

    res.json({ orders, counts });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body ?? {};
    if (!ORDER_STATUSES.includes(status)) {
      throw httpError(400, '올바르지 않은 주문 상태입니다.');
    }
    const order = await Order.findById(req.params.id);
    if (!order) throw httpError(404, '주문을 찾을 수 없습니다.');

    // 상태가 바뀐 시각을 함께 기록 (처음 바뀔 때만)
    const now = new Date();
    order.status = status;
    if (status === 'paid' && order.payment.status !== 'paid') {
      order.payment.status = 'paid';
      order.payment.paidAt ??= now;
    }
    if (status === 'shipped') order.shipping.shippedAt ??= now;
    if (status === 'delivered') {
      order.shipping.shippedAt ??= now;
      order.shipping.deliveredAt ??= now;
    }
    if (status === 'cancelled') order.cancelledAt ??= now;

    await order.save();
    await order.populate('user', 'name email');
    res.json(order);
  } catch (err) {
    next(err);
  }
}

// 매출 분석: 기간별 일 매출, 많이 팔린 상품
export async function getSales(req, res, next) {
  try {
    const days = ALLOWED_DAYS.includes(Number(req.query.days)) ? Number(req.query.days) : 30;

    // 오늘을 포함한 최근 N일 (한국 시간 자정 기준)
    const todayKey = toDateKey(new Date());
    const from = new Date(`${todayKey}T00:00:00+09:00`);
    from.setDate(from.getDate() - (days - 1));
    const match = { ...COUNTED_IN_REVENUE, createdAt: { $gte: from } };

    const [daily, topProducts] = await Promise.all([
      Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIMEZONE } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // 주문이 없는 날도 0으로 채워서 날짜가 빠지지 않게
    const byDate = new Map(daily.map((d) => [d._id, d]));
    const series = Array.from({ length: days }, (_, i) => {
      const date = new Date(from);
      date.setDate(from.getDate() + i);
      const key = toDateKey(date);
      return { date: key, revenue: byDate.get(key)?.revenue ?? 0, orders: byDate.get(key)?.orders ?? 0 };
    });

    const revenue = series.reduce((sum, d) => sum + d.revenue, 0);
    const orderCount = series.reduce((sum, d) => sum + d.orders, 0);

    res.json({
      days,
      revenue,
      orderCount,
      averageOrderValue: orderCount ? Math.round(revenue / orderCount) : 0,
      daily: series,
      topProducts: topProducts.map((p) => ({ name: p._id, quantity: p.quantity, revenue: p.revenue })),
    });
  } catch (err) {
    next(err);
  }
}

// 고객 목록 + 고객별 주문 수, 구매 금액
export async function getCustomers(req, res, next) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const filter = { user_type: 'customer' };
    if (q) {
      const pattern = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: pattern }, { email: pattern }];
    }

    const customers = await User.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    const stats = await Order.aggregate([
      { $match: { user: { $in: customers.map((c) => c._id) } } },
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 },
          totalSpent: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$totalAmount'] },
          },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
    ]);
    const byUser = new Map(stats.map((s) => [s._id.toString(), s]));

    res.json(
      customers.map(({ password, ...customer }) => {
        const s = byUser.get(customer._id.toString());
        return {
          ...customer,
          orderCount: s?.orderCount ?? 0,
          totalSpent: s?.totalSpent ?? 0,
          lastOrderAt: s?.lastOrderAt ?? null,
        };
      })
    );
  } catch (err) {
    next(err);
  }
}
