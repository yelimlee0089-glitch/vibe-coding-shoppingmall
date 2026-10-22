import jwt from 'jsonwebtoken';

export const TOKEN_COOKIE_NAME = 'token';

export const DEFAULT_EXPIRES_IN = '7d';
const DAY_MS = 24 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET 환경 변수가 설정되지 않았습니다.');
  return secret;
}

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), user_type: user.user_type, ver: user.tokenVersion ?? 0 }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
  });
}

// 만료되었거나 위조된 토큰이면 에러를 던짐
export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

// 쿠키 만료 시간을 토큰 만료 시간과 맞춤 (예: '7d' → 7일)
function parseExpiresInMs(value = DEFAULT_EXPIRES_IN) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * DAY_MS;
  const unit = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: DAY_MS }[match[2]];
  return Number(match[1]) * unit;
}

// httpOnly: 자바스크립트로 토큰을 읽을 수 없게 해서 XSS로 토큰이 탈취되는 것을 막음
export function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: parseExpiresInMs(process.env.JWT_EXPIRES_IN),
  };
}
