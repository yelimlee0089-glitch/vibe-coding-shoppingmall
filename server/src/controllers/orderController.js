import { createHash } from 'node:crypto';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import { cancelPayment, getPayment, isPortoneConfigured } from '../services/portone.js';

// 배송비 정책: 5만 원 이상 무료, 미만 3,000원
export const FREE_SHIPPING_THRESHOLD = 50000;
export const SHIPPING_FEE = 3000;

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

// 고객이 입력·수정할 수 있는 배송 정보 (송장번호·발송일 등은 관리자만)
const SHIPPING_INPUT_FIELDS = ['recipientName', 'phone', 'postalCode', 'address1', 'address2', 'memo'];
// 배송지를 바꾸거나 주문을 취소할 수 있는 상태 (발송 전까지만)
const EDITABLE_STATUSES = ['pending', 'paid'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function pickShipping(input) {
  if (!input || typeof input !== 'object') return {};
  return Object.fromEntries(
    SHIPPING_INPUT_FIELDS.filter((field) => input[field] !== undefined).map((field) => [field, input[field]])
  );
}

export const calculateShippingFee = (itemsTotal) => (itemsTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE);

const isAdmin = (user) => user.user_type === 'admin';

const isDuplicateKeyError = (err) => err?.code === 11000;

// 주문 내용 지문: 상품·사이즈·수량·가격·배송비가 모두 같으면 같은 값
// (가격이 바뀌면 다른 주문으로 봄 → 예전 금액의 주문을 재사용하지 않음)
function checkoutSignature(items, shippingFee) {
  const normalized = items
    .map((item) => `${item.product}:${item.size}:${item.quantity}:${item.price}`)
    .sort()
    .join('|');
  return createHash('sha256').update(`${normalized}#${shippingFee}`).digest('hex');
}

/**
 * 주문 생성 전 중복 확인: 같은 장바구니로 이미 만든 '결제 대기' 주문이 있으면 그 주문을 재사용
 * - 결제창을 닫았다가 다시 결제하거나, 결제하기를 여러 번 눌러도 주문이 하나만 생김
 * - 금액 불일치로 결제가 취소된 주문은 같은 주문번호로 다시 결제할 수 없어 닫고 새로 만듦
 * 반환: 재사용할 주문 또는 null
 */
async function findReusablePendingOrder(userId, signature) {
  const existing = await Order.findOne({ user: userId, status: 'pending', checkoutSignature: signature });
  if (!existing) return null;
  if (existing.payment.status === 'failed') {
    existing.status = 'cancelled';
    existing.cancelledAt = new Date();
    existing.cancelReason = '결제 실패로 새 주문을 생성';
    await existing.save();
    return null;
  }
  return existing;
}

// 본인 주문만 (관리자는 모든 주문)
async function findAccessibleOrder(req) {
  const order = await Order.findById(req.params.id);
  // 남의 주문이면 존재 여부도 알려주지 않도록 404
  if (!order || (!order.user.equals(req.user._id) && !isAdmin(req.user))) {
    throw httpError(404, '주문을 찾을 수 없습니다.');
  }
  return order;
}

function parsePage(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? DEFAULT_PAGE_SIZE);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
    throw httpError(400, 'page와 limit은 1 이상의 정수여야 합니다.');
  }
  return { page, limit: Math.min(limit, MAX_PAGE_SIZE) };
}

// POST /api/orders  { shipping: {...}, payment: { method } }
// 내 장바구니의 상품으로 '결제 대기' 주문을 만듦 (상품·금액은 서버가 장바구니와 최신 상품 정보로 계산)
export async function createOrder(req, res, next) {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    // 그사이 삭제된 상품은 제외
    const cartItems = cart?.items.filter((item) => item.product != null) ?? [];
    if (cartItems.length === 0) throw httpError(400, '장바구니가 비어 있습니다.');

    // 담은 뒤 상품의 사이즈 구성이 바뀐 경우
    const invalid = cartItems.find(
      (item) => item.product.sizes.length > 0 && !item.product.sizes.includes(item.size)
    );
    if (invalid) {
      throw httpError(400, `'${invalid.product.name}'의 ${invalid.size || '선택한'} 사이즈는 더 이상 판매하지 않습니다. 장바구니를 확인해 주세요.`);
    }

    // 주문 당시의 상품 정보를 복사 (subtotal·합계·주문번호는 Order 모델이 계산)
    const items = cartItems.map(({ product, size, quantity }) => ({
      product: product._id,
      sku: product.sku ?? '',
      name: product.name,
      imageUrl: product.imageUrl ?? '',
      price: product.price,
      size,
      quantity,
    }));
    const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = calculateShippingFee(itemsTotal);
    const signature = checkoutSignature(items, shippingFee);
    const shipping = pickShipping(req.body?.shipping);
    const method = req.body?.payment?.method;

    // 같은 내용의 결제 대기 주문이 이미 있으면 새로 만들지 않고 배송지·결제수단만 최신 입력으로 바꿔서 재사용
    const reuse = async () => {
      const existing = await findReusablePendingOrder(req.user._id, signature);
      if (!existing) return null;
      existing.shipping = shipping;
      existing.payment.method = method;
      await existing.save();
      return existing;
    };

    const reused = await reuse();
    if (reused) return res.status(200).json(reused);

    try {
      const order = await Order.create({
        user: req.user._id,
        items,
        shipping,
        payment: { method },
        shippingFee,
        checkoutSignature: signature,
      });
      res.status(201).json(order);
    } catch (err) {
      // 거의 동시에 두 번 요청된 경우: 먼저 만들어진 주문을 돌려줌
      if (!isDuplicateKeyError(err)) throw err;
      const existing = await reuse();
      if (!existing) throw err;
      res.status(200).json(existing);
    }
  } catch (err) {
    next(err);
  }
}

// 포트원 키가 없을 때의 모의 결제는 개발 환경에서만 허용 (운영에서 무료 결제 방지)
const canUseMockPayment = () => !isPortoneConfigured() && process.env.NODE_ENV !== 'production';

// 결제가 끝나면 주문한 상품·사이즈만 장바구니에서 제거 (주문 뒤에 새로 담은 상품은 유지)
async function removeOrderedItemsFromCart(order) {
  const ordered = new Set(order.items.map((item) => `${item.product}:${item.size}`));
  const cart = await Cart.findOne({ user: order.user });
  if (!cart) return;
  cart.items = cart.items.filter((item) => !ordered.has(`${item.product}:${item.size}`));
  await cart.save();
}

/**
 * 포트원에 실제 결제 내역을 조회해서 주문과 맞는지 검증 후 '결제 완료' 처리
 * 1) 이 결제(imp_uid)가 이미 다른 주문에 쓰였는지  2) 주문번호(merchant_uid)
 * 3) 결제 상태  4) 통화(KRW)  5) 금액 — 모두 맞아야 함
 * - 결제는 됐는데 금액이 다르면(위변조) 그 결제를 바로 취소
 * - 브라우저와 웹훅이 동시에 호출해도 한 번만 '결제 완료'로 바뀜
 */
async function verifyAndCompletePayment(order, impUid) {
  if (order.status === 'paid' && order.payment.transactionId === impUid) return order;
  if (order.status !== 'pending') throw httpError(409, '결제 대기 중인 주문만 결제할 수 있습니다.');

  const usedByOther = await Order.exists({ 'payment.transactionId': impUid, _id: { $ne: order._id } });
  if (usedByOther) throw httpError(409, '이미 다른 주문에 사용된 결제입니다.');

  const payment = await getPayment(impUid);

  if (payment.merchant_uid !== order.orderNumber) {
    throw httpError(400, '주문 정보와 결제 정보가 일치하지 않습니다.');
  }
  if (payment.status !== 'paid') {
    const reason = { ready: '결제가 아직 완료되지 않았습니다.', cancelled: '취소된 결제입니다.', failed: '실패한 결제입니다.' };
    throw httpError(400, reason[payment.status] ?? '결제가 완료되지 않았습니다.');
  }
  if ((payment.currency ?? 'KRW') !== 'KRW' || payment.amount !== order.totalAmount) {
    // 결제창에서 금액이 조작된 경우: 결제를 취소하고 주문은 결제 실패로 기록
    await cancelPayment({ impUid, reason: '결제 금액 불일치(자동 취소)', amount: payment.amount }).catch((err) =>
      console.error('금액 불일치 결제 자동 취소 실패:', impUid, err.message)
    );
    await Order.updateOne(
      { _id: order._id, status: 'pending' },
      { $set: { 'payment.status': 'failed', 'payment.transactionId': impUid } }
    );
    throw httpError(400, '결제 금액이 주문 금액과 달라 결제를 취소했습니다.');
  }

  // '결제 대기'일 때만 바꿈 → 동시에 두 번 호출돼도 한쪽만 성공
  let completed;
  try {
    completed = await Order.findOneAndUpdate(
      { _id: order._id, status: 'pending' },
      {
        $set: {
          status: 'paid',
          'payment.status': 'paid',
          'payment.paidAt': payment.paid_at ? new Date(payment.paid_at * 1000) : new Date(),
          'payment.transactionId': impUid,
        },
      },
      { new: true }
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) throw httpError(409, '이미 다른 주문에 사용된 결제입니다.');
    throw err;
  }

  if (!completed) {
    // 다른 요청이 먼저 처리한 경우
    const latest = await Order.findById(order._id);
    if (latest?.status === 'paid' && latest.payment.transactionId === impUid) return latest;
    throw httpError(409, '결제 대기 중인 주문만 결제할 수 있습니다.');
  }

  await removeOrderedItemsFromCart(completed);
  return completed;
}

// POST /api/orders/:id/pay  { impUid }
// 결제창에서 결제가 끝난 뒤 호출. 포트원 키가 없으면(개발 환경) 모의 결제로 바로 완료
export async function payOrder(req, res, next) {
  try {
    const order = await findAccessibleOrder(req);
    if (!order.user.equals(req.user._id)) throw httpError(403, '본인 주문만 결제할 수 있습니다.');

    const impUid = typeof req.body?.impUid === 'string' ? req.body.impUid.trim() : '';

    if (!impUid) {
      if (!canUseMockPayment()) throw httpError(400, '결제 정보(imp_uid)가 없습니다.');
      if (order.status !== 'pending') throw httpError(409, '결제 대기 중인 주문만 결제할 수 있습니다.');
      order.status = 'paid';
      order.payment.status = 'paid';
      order.payment.paidAt = new Date();
      order.payment.transactionId = `MOCK-${Date.now()}`;
      await order.save();
      await removeOrderedItemsFromCart(order);
      return res.json(order);
    }

    if (!isPortoneConfigured()) throw httpError(503, '결제 검증 설정(PORTONE_API_KEY/SECRET)이 없습니다.');
    res.json(await verifyAndCompletePayment(order, impUid));
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/config  화면이 어떤 결제 방식을 쓸지 결정 (키 값은 절대 내려주지 않음)
// portone: 실제 결제창 + 서버 검증 / mock: 개발용 모의 결제 / unavailable: 운영인데 키 없음
export function getPaymentConfig(req, res) {
  const provider = isPortoneConfigured() ? 'portone' : canUseMockPayment() ? 'mock' : 'unavailable';
  res.json({ provider });
}

// POST /api/payments/webhook  { imp_uid, merchant_uid, status }
// 포트원이 결제 상태가 바뀔 때 서버로 직접 알려줌 (브라우저가 결제 후 닫혀도 결제 완료를 놓치지 않도록)
// 요청 내용은 믿지 않고 imp_uid 로 포트원에 다시 조회해서 검증함
export async function handlePaymentWebhook(req, res) {
  const impUid = typeof req.body?.imp_uid === 'string' ? req.body.imp_uid : '';
  const merchantUid = typeof req.body?.merchant_uid === 'string' ? req.body.merchant_uid : '';
  if (!impUid || !merchantUid || !isPortoneConfigured()) return res.status(400).json({ message: '잘못된 요청입니다.' });

  try {
    const order = await Order.findOne({ orderNumber: merchantUid });
    if (!order) return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    if (order.status === 'pending') await verifyAndCompletePayment(order, impUid);
    res.json({ message: 'ok' });
  } catch (err) {
    // 포트원은 200 이 아니면 재전송하므로, 검증 실패 내용만 남기고 응답
    console.error('결제 웹훅 처리 실패:', merchantUid, err.message);
    res.status(err.status && err.status < 500 ? 200 : 500).json({ message: err.message });
  }
}

// 내 주문 탭 → 주문 상태 (전체는 필터 없음)
const ORDER_TABS = {
  processing: ['paid'], // 상품 처리중: 결제 완료 후 발송 전
  shipped: ['shipped'],
  delivered: ['delivered'],
  pending: ['pending'],
  cancelled: ['cancelled'],
};

// GET /api/orders?tab=processing&page=1&limit=10  내 주문 내역 (최신순)
// 응답에 탭별 개수(counts)를 함께 줌
export async function getMyOrders(req, res, next) {
  try {
    const { page, limit } = parsePage(req.query);
    const tab = req.query.tab ?? 'all';
    if (tab !== 'all' && !ORDER_TABS[tab]) {
      throw httpError(400, `tab 은 all, ${Object.keys(ORDER_TABS).join(', ')} 중 하나여야 합니다.`);
    }

    const filter = { user: req.user._id, ...(tab !== 'all' && { status: { $in: ORDER_TABS[tab] } }) };
    const [orders, total, statusCounts] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Order.countDocuments(filter),
      Order.aggregate([{ $match: { user: req.user._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const byStatus = Object.fromEntries(statusCounts.map(({ _id, count }) => [_id, count]));
    const counts = {
      all: statusCounts.reduce((sum, { count }) => sum + count, 0),
      ...Object.fromEntries(
        Object.entries(ORDER_TABS).map(([key, statuses]) => [key, statuses.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0)])
      ),
    };

    const totalPages = Math.max(Math.ceil(total / limit), 1);
    res.json({
      orders,
      counts,
      pagination: { page, limit, total, totalPages, hasPrevPage: page > 1, hasNextPage: page < totalPages },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id
export async function getOrder(req, res, next) {
  try {
    const order = await findAccessibleOrder(req);
    res.json(order);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/orders/:id  { shipping: {...} }  발송 전까지 배송 정보만 수정 가능
export async function updateOrder(req, res, next) {
  try {
    const order = await findAccessibleOrder(req);
    if (!EDITABLE_STATUSES.includes(order.status)) {
      throw httpError(409, '이미 발송되었거나 취소된 주문은 배송 정보를 바꿀 수 없습니다.');
    }
    const changes = pickShipping(req.body?.shipping);
    if (Object.keys(changes).length === 0) throw httpError(400, '수정할 배송 정보를 보내 주세요.');

    order.shipping.set(changes);
    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/orders/:id  { reason? }  주문 취소 (기록은 남기고 상태만 '취소'로)
export async function cancelOrder(req, res, next) {
  try {
    const order = await findAccessibleOrder(req);
    if (!EDITABLE_STATUSES.includes(order.status)) {
      throw httpError(409, order.status === 'cancelled' ? '이미 취소된 주문입니다.' : '이미 발송된 주문은 취소할 수 없습니다.');
    }

    // 결제까지 끝난 주문은 환불 (모의 결제는 상태만 기록, 실제 결제는 포트원에 취소 요청)
    if (order.payment.status === 'paid') {
      const { transactionId } = order.payment;
      if (transactionId && !transactionId.startsWith('MOCK-')) {
        if (!isPortoneConfigured()) throw httpError(503, '환불 설정(PORTONE_API_KEY/SECRET)이 없어 취소할 수 없습니다.');
        await cancelPayment({ impUid: transactionId, reason: req.body?.reason || '고객 주문 취소', amount: order.totalAmount });
      }
      order.payment.status = 'refunded';
    }
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 200) : '';
    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
}
