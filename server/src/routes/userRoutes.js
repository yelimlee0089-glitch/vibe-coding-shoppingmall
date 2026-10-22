import { Router } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// 회원가입만 누구나 (가입 시 user_type 은 항상 customer)
router.post('/', createUser);

// 회원 목록·조회·수정·삭제는 관리자만 (회원 정보 노출·관리자 권한 탈취 방지)
router.get('/', requireAuth, requireAdmin, getUsers);
router.get('/:id', requireAuth, requireAdmin, getUser);
router.patch('/:id', requireAuth, requireAdmin, updateUser);
router.delete('/:id', requireAuth, requireAdmin, deleteUser);

export default router;
