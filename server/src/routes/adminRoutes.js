import { Router } from 'express';
import {
  getStats,
  getOrders,
  updateOrderStatus,
  getSales,
  getCustomers,
} from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// 이 라우터의 모든 API는 관리자만 사용 가능
router.use(requireAuth, requireAdmin);

router.get('/stats', getStats);
router.get('/orders', getOrders);
router.patch('/orders/:id/status', updateOrderStatus);
router.get('/sales', getSales);
router.get('/customers', getCustomers);

export default router;
