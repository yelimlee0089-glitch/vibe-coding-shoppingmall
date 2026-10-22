import mongoose from 'mongoose';
import { SIZES } from './Product.js';

// 주문 진행 상태 (관리자 주문 관리 화면과 같은 값)
export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
export const PAYMENT_METHODS = ['card', 'bank_transfer', 'kakaopay', 'naverpay', 'tosspay'];
export const PAYMENT_STATUSES = ['ready', 'paid', 'failed', 'refunded'];

const PHONE_PATTERN = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const POSTAL_CODE_PATTERN = /^\d{5}$/;

// 주문 상품: 주문 당시의 상품 정보를 그대로 복사해 둠
// (나중에 상품 가격이 바뀌거나 상품이 삭제돼도 주문 내역·매출은 그대로 유지)
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String, trim: true, default: '' },
    name: { type: String, required: [true, '상품명은 필수입니다.'], trim: true },
    imageUrl: { type: String, trim: true, default: '' },
    price: { type: Number, required: [true, '가격은 필수입니다.'], min: [0, '가격은 0원 이상이어야 합니다.'] },
    size: {
      type: String,
      enum: { values: [...SIZES, ''], message: '올바르지 않은 사이즈입니다.' },
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, '수량은 필수입니다.'],
      min: [1, '수량은 1개 이상이어야 합니다.'],
      validate: { validator: Number.isInteger, message: '수량은 정수여야 합니다.' },
    },
    // price × quantity (저장 직전에 자동 계산)
    subtotal: { type: Number, min: 0 },
  },
  { _id: false }
);

// 배송 정보
const shippingSchema = new mongoose.Schema(
  {
    recipientName: { type: String, required: [true, '받는 사람 이름은 필수입니다.'], trim: true },
    phone: {
      type: String,
      required: [true, '연락처는 필수입니다.'],
      trim: true,
      match: [PHONE_PATTERN, '올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)'],
    },
    postalCode: {
      type: String,
      required: [true, '우편번호는 필수입니다.'],
      trim: true,
      match: [POSTAL_CODE_PATTERN, '우편번호는 5자리 숫자입니다.'],
    },
    address1: { type: String, required: [true, '주소는 필수입니다.'], trim: true },
    address2: { type: String, trim: true, default: '' },
    memo: { type: String, trim: true, maxlength: [100, '배송 요청사항은 100자까지 입력할 수 있습니다.'], default: '' },
    // 관리자가 발송 처리할 때 입력
    courier: { type: String, trim: true, default: '' },
    trackingNumber: { type: String, trim: true, default: '' },
    shippedAt: Date,
    deliveredAt: Date,
  },
  { _id: false }
);

// 결제 정보 (주문 상태와 별개로 결제 자체의 상태를 기록)
const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      required: [true, '결제 수단은 필수입니다.'],
      enum: { values: PAYMENT_METHODS, message: '올바르지 않은 결제 수단입니다.' },
    },
    status: {
      type: String,
      enum: { values: PAYMENT_STATUSES, message: '올바르지 않은 결제 상태입니다.' },
      default: 'ready',
    },
    paidAt: Date,
    // 결제 대행사(PG)가 발급한 결제 번호 (환불·문의 시 필요)
    transactionId: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // 고객에게 보여줄 주문번호 (예: 20261018-7K3QX2). 비워 두면 자동 생성
    orderNumber: { type: String, unique: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, '주문자는 필수입니다.'] },
    items: {
      type: [orderItemSchema],
      validate: [(items) => items.length > 0, '주문 상품이 없습니다.'],
    },
    shipping: { type: shippingSchema, required: [true, '배송 정보는 필수입니다.'] },
    payment: { type: paymentSchema, required: [true, '결제 정보는 필수입니다.'] },

    // 금액 (itemsTotal·totalAmount 는 저장 직전에 자동 계산)
    itemsTotal: { type: Number, min: 0 },
    shippingFee: { type: Number, min: [0, '배송비는 0원 이상이어야 합니다.'], default: 0 },
    discountAmount: { type: Number, min: [0, '할인 금액은 0원 이상이어야 합니다.'], default: 0 },
    // 최종 결제 금액 = 상품 금액 + 배송비 − 할인 (관리자 매출 계산에 사용)
    totalAmount: { type: Number, min: [0, '결제 금액이 0원보다 작을 수 없습니다.'] },

    status: {
      type: String,
      enum: { values: ORDER_STATUSES, message: '올바르지 않은 주문 상태입니다.' },
      default: 'pending',
    },
    cancelledAt: Date,
    cancelReason: { type: String, trim: true, default: '' },
    // 주문 내용(상품·사이즈·수량·가격·배송비) 지문. 같은 장바구니로 결제 대기 주문이 중복 생성되는 것을 막는 데 사용
    checkoutSignature: { type: String },
  },
  { timestamps: true }
);

// 주문번호: 한국 날짜 + 헷갈리는 글자(0/O, 1/I/L)를 뺀 랜덤 6자
const ORDER_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateOrderNumber(date = new Date()) {
  const ymd = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).replaceAll('-', '');
  const code = Array.from({ length: 6 }, () => ORDER_CODE_CHARS[Math.floor(Math.random() * ORDER_CODE_CHARS.length)]).join('');
  return `${ymd}-${code}`;
}

// 금액은 항상 서버에서 다시 계산 (클라이언트가 보낸 합계는 믿지 않음)
orderSchema.pre('validate', function () {
  if (!this.orderNumber) this.orderNumber = generateOrderNumber(this.createdAt);

  this.items.forEach((item) => {
    item.subtotal = item.price * item.quantity;
  });
  this.itemsTotal = this.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  this.totalAmount = this.itemsTotal + (this.shippingFee || 0) - (this.discountAmount || 0);
});

orderSchema.index({ createdAt: -1 });
// 내 주문 내역 (회원별 최신순)
orderSchema.index({ user: 1, createdAt: -1 });
// 관리자 상태별 목록
orderSchema.index({ status: 1, createdAt: -1 });
// 같은 회원·같은 주문 내용의 '결제 대기' 주문은 하나만 (동시에 두 번 눌러도 DB가 중복을 막음)
orderSchema.index(
  { user: 1, checkoutSignature: 1 },
  { unique: true, partialFilterExpression: { status: 'pending', checkoutSignature: { $exists: true } } }
);
// 결제 하나(포트원 imp_uid)로 주문 두 개를 결제 완료할 수 없음
orderSchema.index(
  { 'payment.transactionId': 1 },
  { unique: true, partialFilterExpression: { 'payment.transactionId': { $gt: '' } } }
);

export default mongoose.model('Order', orderSchema);
