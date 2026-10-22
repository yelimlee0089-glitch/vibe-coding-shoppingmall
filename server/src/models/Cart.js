import mongoose from 'mongoose';
import { SIZES } from './Product.js';

export const MAX_ITEM_QUANTITY = 99;
export const MAX_CART_ITEMS = 50;

// 장바구니에는 상품 ID·사이즈·수량만 저장
// (상품명·가격·이미지는 조회할 때 populate 로 최신 정보를 가져옴 → 가격이 바뀌어도 장바구니에 바로 반영)
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, '상품은 필수입니다.'],
    },
    // 사이즈가 없는 상품(액세서리·책 등)은 빈 문자열
    size: {
      type: String,
      enum: { values: [...SIZES, ''], message: '올바르지 않은 사이즈입니다.' },
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, '수량은 필수입니다.'],
      min: [1, '수량은 1개 이상이어야 합니다.'],
      max: [MAX_ITEM_QUANTITY, `수량은 ${MAX_ITEM_QUANTITY}개까지 담을 수 있습니다.`],
      validate: { validator: Number.isInteger, message: '수량은 정수여야 합니다.' },
    },
  },
  // 항목마다 _id 를 두어 수량 변경·삭제 시 항목을 지정할 수 있게 함
  {
    timestamps: { createdAt: 'addedAt', updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 상품 정보가 populate 되어 있을 때만 가격을 알 수 있음
const isPopulated = (product) => product != null && typeof product === 'object' && 'price' in product;

// 항목별 금액 = 현재 상품 가격 × 수량 (populate 전이거나 삭제된 상품이면 null)
cartItemSchema.virtual('subtotal').get(function () {
  return isPopulated(this.product) ? this.product.price * this.quantity : null;
});

const cartSchema = new mongoose.Schema(
  {
    // 회원 한 명당 장바구니 하나
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '사용자는 필수입니다.'],
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: [
        {
          validator: (items) => items.length <= MAX_CART_ITEMS,
          message: `장바구니에는 최대 ${MAX_CART_ITEMS}개 상품까지 담을 수 있습니다.`,
        },
        {
          // 같은 상품·같은 사이즈는 한 줄로 (다시 담으면 수량을 늘리도록)
          validator: (items) => {
            const keys = items.map((item) => `${item.product}:${item.size}`);
            return new Set(keys).size === keys.length;
          },
          message: '같은 상품과 사이즈가 장바구니에 중복으로 들어 있습니다.',
        },
      ],
    },
  },
  {
    timestamps: true,
    // 계산 값(totalQuantity, totalAmount)도 응답 JSON 에 포함
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 전체 수량 (DB 조회 없이 계산 가능)
cartSchema.virtual('totalQuantity').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// 총 금액: 최신 상품 가격 기준. 반드시 populate('items.product') 후에 사용
// - 삭제되어 찾을 수 없는 상품은 금액에서 제외
// - populate 하지 않고 읽으면 null (가격을 모르는데 0원으로 보이는 실수 방지)
cartSchema.virtual('totalAmount').get(function () {
  if (this.items.length === 0) return 0;
  if (this.items.some((item) => item.product != null && !isPopulated(item.product))) return null;
  return this.items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
});

export default mongoose.model('Cart', cartSchema);
