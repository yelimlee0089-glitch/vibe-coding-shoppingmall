import { Router } from 'express';
import { login, logout, getMe, forgotPassword, resetPassword } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

// 비밀번호 찾기: 재설정 링크 메일 발송 → 링크에서 새 비밀번호 설정
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
