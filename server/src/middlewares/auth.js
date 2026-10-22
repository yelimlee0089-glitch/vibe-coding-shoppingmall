import User from '../models/User.js';
import { TOKEN_COOKIE_NAME, verifyToken } from '../utils/token.js';

function unauthorized(message = '로그인이 필요합니다.') {
  const err = new Error(message);
  err.status = 401;
  return err;
}

// Authorization: Bearer <토큰> 헤더를 우선 확인하고, 없으면 쿠키에서 가져옴
function getToken(req) {
  const [scheme, value] = req.headers.authorization?.split(' ') ?? [];
  if (scheme === 'Bearer' && value) return value;
  return req.cookies?.[TOKEN_COOKIE_NAME];
}

// 토큰을 확인하고, 로그인한 사용자를 req.user 에 담음
export async function requireAuth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) throw unauthorized();

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw unauthorized('로그인이 만료되었습니다. 다시 로그인해 주세요.');
    }

    // 토큰 발급 후 탈퇴(삭제)된 사용자는 거부
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user) throw unauthorized();
    // 비밀번호를 바꾸기 전에 발급된 토큰은 거부 (비밀번호 재설정 시 다른 기기 로그아웃)
    if ((payload.ver ?? 0) !== (user.tokenVersion ?? 0)) {
      throw unauthorized('비밀번호가 변경되어 다시 로그인해야 합니다.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// requireAuth 뒤에 사용. 관리자만 통과
export function requireAdmin(req, res, next) {
  if (req.user?.user_type !== 'admin') {
    const err = new Error('관리자만 접근할 수 있습니다.');
    err.status = 403;
    return next(err);
  }
  next();
}
