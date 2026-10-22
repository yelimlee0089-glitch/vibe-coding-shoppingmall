import mongoose from 'mongoose';

export const USER_TYPES = ['customer', 'admin'];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, '이메일은 필수입니다.'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '올바른 이메일 형식이 아닙니다.'],
    },
    name: { type: String, required: [true, '이름은 필수입니다.'], trim: true },
    // 조회 시 기본으로 제외됨. 로그인 확인 등에 필요하면 .select('+password') 사용
    password: { type: String, required: [true, '비밀번호는 필수입니다.'], select: false },
    user_type: {
      type: String,
      required: true,
      enum: { values: USER_TYPES, message: 'user_type은 customer 또는 admin만 가능합니다.' },
      default: 'customer',
    },
    address: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
