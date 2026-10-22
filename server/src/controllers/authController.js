import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { toUserResponse } from './userController.js';
import {
  DEFAULT_EXPIRES_IN,
  TOKEN_COOKIE_NAME,
  getCookieOptions,
  signToken,
} from '../utils/token.js';

const INVALID_CREDENTIALS = '이메일 또는 비밀번호가 올바르지 않습니다.';

// 존재하지 않는 이메일일 때도 비밀번호 비교를 한 번 수행해서
// 응답 시간 차이로 가입 여부를 알아내지 못하게 함
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function login(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      throw httpError(400, '이메일과 비밀번호를 모두 입력해 주세요.');
    }

    const user = await User.findOne({ email }).select('+password');
    const isMatch = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

    // 이메일이 없는 경우와 비밀번호가 틀린 경우를 구분하지 않음 (가입 여부 노출 방지)
    if (!user || !isMatch) {
      throw httpError(401, INVALID_CREDENTIALS);
    }

    // 토큰 발급: 브라우저용 httpOnly 쿠키 + 앱/외부 클라이언트용 응답 본문
    const token = signToken(user);
    res.cookie(TOKEN_COOKIE_NAME, token, getCookieOptions());
    res.json({
      message: '로그인되었습니다.',
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
      user: toUserResponse(user),
    });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  const { maxAge, ...options } = getCookieOptions();
  res.clearCookie(TOKEN_COOKIE_NAME, options);
  res.status(204).end();
}

// requireAuth 를 거친 뒤 호출됨
export function getMe(req, res) {
  res.json({ user: toUserResponse(req.user) });
}
