import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrder,
  cancelOrder,
  payOrder,
} from '../controllers/orderController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// 주문은 로그인한 회원 본인 것만 (관리자는 단건 조회·수정·취소 가능, 상태 변경은 /api/admin/orders)
router.use(requireAuth);

router.post('/', createOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrder);
router.patch('/:id', updateOrder);
router.delete('/:id', cancelOrder);
router.post('/:id/pay', payOrder);

export default router;
