import mongoose from 'mongoose';

export const CATEGORIES = ['Apparel', 'Accessories', 'Meditation', 'Books&Journals'];
export const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

// 영문 대문자·숫자·하이픈 3~32자 (예: APP-JOG-001)
const SKU_PATTERN = /^[A-Z0-9-]{3,32}$/;

const productSchema = new mongoose.Schema(
  {
    // 상품 ID. 소문자로 입력해도 대문자로 저장되어 'app-001'과 'APP-001'이 중복으로 처리됨
    sku: {
      type: String,
      required: [true, 'SKU는 필수입니다.'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [SKU_PATTERN, 'SKU는 영문 대문자, 숫자, 하이픈(-)으로 3~32자여야 합니다.'],
    },
    name: { type: String, required: [true, '상품명은 필수입니다.'], trim: true },
    price: {
      type: Number,
      required: [true, '가격은 필수입니다.'],
      min: [0, '가격은 0원 이상이어야 합니다.'],
    },
    category: {
      type: String,
      required: [true, '카테고리는 필수입니다.'],
      enum: {
        values: CATEGORIES,
        message: '카테고리는 Apparel, Accessories, Meditation, Books&Journals 중 하나여야 합니다.',
      },
    },
    // Cloudinary에 업로드한 이미지의 주소 (secure_url)
    imageUrl: {
      type: String,
      required: [true, '상품 이미지는 필수입니다.'],
      trim: true,
      match: [/^https:\/\//, '이미지 주소는 https:// 로 시작해야 합니다.'],
    },
    // Cloudinary의 public_id. 나중에 이미지를 교체·삭제할 때 필요
    imagePublicId: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    sizes: { type: [{ type: String, enum: SIZES }], default: [] },
    stock: { type: Number, default: 0, min: [0, '재고는 0 이상이어야 합니다.'] },
  },
  { timestamps: true }
);

productSchema.index({ category: 1, createdAt: -1 });

export default mongoose.model('Product', productSchema);
