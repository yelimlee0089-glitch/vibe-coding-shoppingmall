import { Router } from 'express';
import { getPaymentConfig, handlePaymentWebhook } from '../controllers/orderController.js';

const router = Router();

router.get('/config', getPaymentConfig);

// 포트원 관리자 콘솔 > 결제 연동 > 웹훅 URL 에 https://<서버 주소>/api/payments/webhook 등록
// 로그인 없이 포트원 서버가 호출하므로, 내용은 포트원 API로 다시 조회해서 검증함
router.post('/webhook', handlePaymentWebhook);

export default router;
