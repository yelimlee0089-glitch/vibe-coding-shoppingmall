import { Router } from 'express';
import {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
} from '../controllers/cartController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// 장바구니는 로그인한 회원 본인 것만 다룸 (회원 ID는 토큰에서 가져옴)
router.use(requireAuth);

router.get('/', getCart);
router.delete('/', clearCart);
router.post('/items', addItem);
router.patch('/items/:itemId', updateItem);
router.delete('/items/:itemId', removeItem);

export default router;
