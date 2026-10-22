import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Order, { PAYMENT_METHODS } from '../src/models/Order.js';
import Product from '../src/models/Product.js';
import User from '../src/models/User.js';

// 관리자 대시보드 확인용 샘플 주문을 만듦 (기존 주문은 지우지 않고 추가만 함)
const ORDER_COUNT = Number(process.argv[2]) || 40;
const DAYS = 30;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const STATUS_WEIGHTS = [
  ['delivered', 5],
  ['shipped', 2],
  ['paid', 2],
  ['pending', 1],
  ['cancelled', 1],
];
const pickStatus = () => pick(STATUS_WEIGHTS.flatMap(([status, weight]) => Array(weight).fill(status)));

const SAMPLE_ADDRESSES = [
  { postalCode: '04524', address1: '서울특별시 중구 세종대로 110' },
  { postalCode: '06236', address1: '서울특별시 강남구 테헤란로 152' },
  { postalCode: '48058', address1: '부산광역시 해운대구 센텀중앙로 79' },
];
const HOUR = 60 * 60 * 1000;
const randomPhone = () => `010-${1000 + Math.floor(Math.random() * 9000)}-${1000 + Math.floor(Math.random() * 9000)}`;

// 주문 상태에 맞는 결제·배송 기록 (예: 배송 완료 주문은 결제·발송·도착 시각이 모두 있음)
function buildProgress(status, createdAt) {
  const at = (hours) => new Date(createdAt.getTime() + hours * HOUR);
  const paid = status !== 'pending';
  const shipped = status === 'shipped' || status === 'delivered';
  return {
    payment: { status: paid ? 'paid' : 'ready', paidAt: paid ? at(0.1) : undefined },
    shipping: {
      courier: shipped ? 'CJ대한통운' : '',
      trackingNumber: shipped ? String(Math.floor(1e11 + Math.random() * 9e11)) : '',
      shippedAt: shipped ? at(24) : undefined,
      deliveredAt: status === 'delivered' ? at(60) : undefined,
    },
    cancelledAt: status === 'cancelled' ? at(2) : undefined,
    cancelReason: status === 'cancelled' ? '단순 변심' : '',
  };
}

try {
  await connectDB();
  const [products, customers] = await Promise.all([
    Product.find().lean(),
    User.find({ user_type: 'customer' }).lean(),
  ]);
  if (products.length === 0 || customers.length === 0) {
    throw new Error('상품과 일반 회원이 각각 1개 이상 있어야 합니다. (상품: npm run seed)');
  }

  const orders = Array.from({ length: ORDER_COUNT }, () => {
    const items = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
      const product = pick(products);
      return {
        product: product._id,
        sku: product.sku ?? '',
        name: product.name,
        imageUrl: product.imageUrl ?? '',
        price: product.price,
        size: product.sizes?.length ? pick(product.sizes) : '',
        quantity: 1 + Math.floor(Math.random() * 2),
      };
    });
    const customer = pick(customers);
    const createdAt = new Date(Date.now() - Math.random() * DAYS * 24 * 60 * 60 * 1000);
    const status = pickStatus();
    const progress = buildProgress(status, createdAt);
    const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // 금액(subtotal·itemsTotal·totalAmount)과 주문번호는 Order 모델이 자동으로 채움
    return {
      user: customer._id,
      items,
      shipping: {
        recipientName: customer.name,
        phone: randomPhone(),
        ...pick(SAMPLE_ADDRESSES),
        address2: `${100 + Math.floor(Math.random() * 900)}호`,
        ...progress.shipping,
      },
      payment: { method: pick(PAYMENT_METHODS), ...progress.payment },
      // 샘플 배송비 규칙: 5만 원 이상 무료, 미만 3,000원
      shippingFee: itemsTotal >= 50000 ? 0 : 3000,
      status,
      cancelledAt: progress.cancelledAt,
      cancelReason: progress.cancelReason,
      createdAt,
      updatedAt: createdAt,
    };
  });

  // timestamps 를 직접 지정하기 위해 insertMany 의 timestamps 옵션을 끔
  await Order.insertMany(orders, { timestamps: false });
  console.log(`샘플 주문 ${orders.length}개를 추가했습니다.`);
} catch (err) {
  console.error('시드 실패:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
