import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Product from '../src/models/Product.js';

// 이미지는 Cloudinary 공식 데모 이미지(임시). 실제 상품 이미지로 교체해서 사용
const SAMPLE_IMAGE = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

const products = [
  { sku: 'APP-JOG-LIM', name: 'Wide jogger pants (Fleece) (Unisex)_Lime', price: 139000, category: 'Apparel', sizes: ['XS', 'S', 'M', 'L', 'XL'], stock: 12 },
  { sku: 'APP-JOG-NVY', name: 'Wide jogger pants (Fleece) (Unisex)_Navy', price: 139000, category: 'Apparel', sizes: ['S', 'M', 'L'], stock: 8 },
  { sku: 'APP-JOG-CHC', name: 'Wide jogger pants (Fleece) (Unisex)_Charcoal', price: 139000, category: 'Apparel', sizes: ['XS', 'S', 'M', 'L', 'XL'], stock: 15 },
  { sku: 'APP-TOP-BLK', name: 'Boat neck long sleeve top_Black', price: 98000, category: 'Apparel', sizes: ['XS', 'S', 'M'], stock: 6 },
  { sku: 'APP-SWT-OAT', name: 'V-neck sweatshirt (Unisex)_Oatmeal', price: 159000, category: 'Apparel', sizes: ['S', 'M', 'L', 'XL'], stock: 10 },
  { sku: 'ACC-BNI-MLT', name: 'Striped knit beanie_Multi', price: 59000, category: 'Accessories', stock: 30 },
  { sku: 'MED-CUS-OAT', name: 'Buckwheat meditation cushion_Oatmeal', price: 89000, category: 'Meditation', stock: 14 },
  { sku: 'MED-MAT-BRN', name: 'Cork yoga mat_Brown', price: 119000, category: 'Meditation', stock: 9 },
  { sku: 'BKJ-JNL-NVY', name: 'Daily reflection journal_Navy', price: 32000, category: 'Books&Journals', stock: 40 },
].map((product) => ({ imageUrl: SAMPLE_IMAGE, ...product }));

try {
  await connectDB();
  await Product.deleteMany({});
  const created = await Product.insertMany(products);
  console.log(`샘플 상품 ${created.length}개를 등록했습니다.`);
} catch (err) {
  console.error('시드 실패:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
