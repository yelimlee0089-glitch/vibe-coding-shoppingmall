import mongoose from 'mongoose';

// MONGODB_URI(예: MongoDB Atlas 주소)가 비어 있을 때만 쓰는 로컬 MongoDB 주소
export const LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/shoppingmall';

export async function connectDB() {
  // 기본: .env 의 MONGODB_URI / 값이 없거나 공백뿐이면: 로컬 주소
  const envUri = process.env.MONGODB_URI?.trim();
  const uri = envUri || LOCAL_MONGODB_URI;
  if (!envUri) {
    console.warn(`MONGODB_URI 가 비어 있어 로컬 MongoDB(${LOCAL_MONGODB_URI})에 연결합니다.`);
  }

  await mongoose.connect(uri);
  console.log(`MongoDB 연결 성공: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
