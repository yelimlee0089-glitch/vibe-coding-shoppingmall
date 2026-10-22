import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Heroku·Vercel 같은 프록시 뒤에서 실행되므로 실제 접속 정보(https, IP)를 프록시 헤더에서 읽음
app.set('trust proxy', 1);

// CLIENT_URL 은 쉼표로 여러 개 지정 가능 (예: https://내앱.vercel.app,http://localhost:5173)
// credentials: 로그인 쿠키를 주고받기 위해 필요 (이때 origin 에 '*' 는 사용할 수 없음)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
