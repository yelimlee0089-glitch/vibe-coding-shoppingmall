// 포트원(아임포트 v1) REST API
// 결제 금액·상태는 브라우저가 보낸 값이 아니라 반드시 이 API로 포트원에 직접 확인해야 함
const API_BASE = process.env.PORTONE_API_BASE || 'https://api.iamport.kr';

export const isPortoneConfigured = () =>
  Boolean(process.env.PORTONE_API_KEY && process.env.PORTONE_API_SECRET);

// 테스트 채널(sandbox) 결제도 인정할지. 테스트 결제는 실제 돈이 오가지 않으므로
// 운영에서 켜 두면 테스트 결제로 '결제 완료'를 만들 수 있음 → 개발·테스트 중에만 true
const allowSandbox = () => process.env.PORTONE_ALLOW_SANDBOX === 'true';

function portoneError(message, status = 502) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// 포트원 응답 형식: { code: 0, message, response }. code 가 0 이 아니면 실패
async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw portoneError('결제 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.code !== 0) {
    throw portoneError(data?.message || '결제 정보를 확인하지 못했습니다.', res.status === 404 ? 404 : 502);
  }
  return data.response;
}

// 액세스 토큰은 만료 1분 전까지 재사용
let cachedToken = null;
async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.value;
  const response = await request('/users/getToken', {
    method: 'POST',
    body: { imp_key: process.env.PORTONE_API_KEY, imp_secret: process.env.PORTONE_API_SECRET },
  });
  cachedToken = { value: response.access_token, expiresAt: response.expired_at * 1000 };
  return cachedToken.value;
}

// 결제 단건 조회: { imp_uid, merchant_uid, amount, status, pay_method, paid_at, ... }
// 포트원 v1 은 테스트 채널 결제를 include_sandbox=true 로 조회해야 찾을 수 있음
export async function getPayment(impUid) {
  const token = await getAccessToken();
  const query = allowSandbox() ? '?include_sandbox=true' : '';
  return request(`/payments/${encodeURIComponent(impUid)}${query}`, { token });
}

// 결제 취소(전액 환불)
export async function cancelPayment({ impUid, reason, amount }) {
  const token = await getAccessToken();
  return request('/payments/cancel', {
    method: 'POST',
    token,
    body: { imp_uid: impUid, reason, ...(amount ? { checksum: amount } : {}) },
  });
}
