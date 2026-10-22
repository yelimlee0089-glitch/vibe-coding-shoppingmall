import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { toUserResponse } from './userController.js';
import { sendMail } from '../services/mailer.js';
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

    const user = await User.findOne({ email }).select('+password +tokenVersion');
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

// ---------- 비밀번호 찾기 ----------
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 재설정 링크 유효 시간 30분
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000; // 같은 계정으로 1분에 한 번만 메일 발송
const SALT_ROUNDS = 10;
const FORGOT_PASSWORD_MESSAGE =
  '입력하신 이메일로 가입된 계정이 있다면 비밀번호 재설정 링크를 보냈습니다. 메일함을 확인해 주세요.';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

// 재설정 링크가 열릴 프론트엔드 주소 (CLIENT_URL 이 여러 개면 첫 번째)
function frontendUrl() {
  const first = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
  return first.replace(/\/+$/, '');
}

// POST /api/auth/forgot-password  { email }
// 가입 여부와 상관없이 항상 같은 응답 (어떤 이메일이 가입됐는지 알아낼 수 없도록)
export async function forgotPassword(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) throw httpError(400, '이메일을 입력해 주세요.');

    const user = await User.findOne({ email }).select('+passwordResetRequestedAt');
    const recentlyRequested =
      user?.passwordResetRequestedAt && Date.now() - user.passwordResetRequestedAt.getTime() < RESET_REQUEST_COOLDOWN_MS;

    if (user && !recentlyRequested) {
      // 토큰 원문은 메일로만 보내고, DB 에는 해시만 저장
      const token = randomBytes(32).toString('hex');
      user.passwordResetTokenHash = hashToken(token);
      user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      user.passwordResetRequestedAt = new Date();
      await user.save({ validateModifiedOnly: true });

      const link = `${frontendUrl()}/reset-password?token=${token}`;
      try {
        await sendMail({
          to: user.email,
          subject: '[LIMSTAGE] 비밀번호 재설정 안내',
          text: `${user.name}님, 아래 링크에서 새 비밀번호를 설정해 주세요. (30분 동안 유효)\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.`,
          html: `<p>${user.name}님, 아래 버튼을 눌러 새 비밀번호를 설정해 주세요. (30분 동안 유효)</p>
<p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#1a1a1a;color:#fff;text-decoration:none">비밀번호 재설정</a></p>
<p style="color:#666;font-size:12px">본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>`,
        });
      } catch (err) {
        // 메일 발송 실패는 서버 로그로만 남김 (응답을 바꾸면 가입 여부가 드러남)
        console.error('비밀번호 재설정 메일 발송 실패:', err.message);
      }
    }

    res.json({ message: FORGOT_PASSWORD_MESSAGE });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password  { token, password }
export async function resetPassword(req, res, next) {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!token) throw httpError(400, '재설정 링크가 올바르지 않습니다.');
    if (!password) throw httpError(400, '새 비밀번호를 입력해 주세요.');

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    }).select('+tokenVersion');
    if (!user) throw httpError(400, '재설정 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.');

    user.password = await bcrypt.hash(password, SALT_ROUNDS);
    // 링크는 한 번만 사용
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    // 이전에 발급된 로그인 토큰 무효화 (토큰 버전 +1)
    user.passwordChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save({ validateModifiedOnly: true });

    // 이 브라우저의 기존 로그인도 정리 → 새 비밀번호로 다시 로그인
    const { maxAge, ...options } = getCookieOptions();
    res.clearCookie(TOKEN_COOKIE_NAME, options);
    res.json({ message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.' });
  } catch (err) {
    next(err);
  }
}

