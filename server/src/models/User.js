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
    // 비밀번호 재설정: 메일로 보낸 토큰의 해시만 저장 (원래 토큰은 DB에 남기지 않음)
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordResetRequestedAt: { type: Date, select: false },
    // 비밀번호를 바꾼 시각 (기록용)
    passwordChangedAt: { type: Date, select: false },
    // 로그인 토큰 버전. 비밀번호를 바꾸면 1 올라가서 이전에 발급된 로그인이 모두 무효 (다른 기기 로그아웃)
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

export default mongoose.model('User', userSchema);
