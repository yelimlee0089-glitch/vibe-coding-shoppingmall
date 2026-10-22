import axios from 'axios'

// 주소에 슬래시가 겹쳐 들어가도(예: https://서버.com//api/) 한 개로 정리
const normalizeBaseUrl = (url) => url.replace(/([^:/])\/{2,}/g, '$1/').replace(/\/+$/, '')

const api = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || '/api'),
  headers: { 'Content-Type': 'application/json' },
  // 로그인 쿠키를 요청에 함께 보냄
  withCredentials: true,
})

// 로그인 여부와 상관없이 401 이 정상인 요청 (로그인 확인·로그인 시도·비밀번호 찾기)
const AUTH_CHECK_URLS = ['/auth/me', '/auth/login', '/auth/forgot-password', '/auth/reset-password']
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message
    // 로그인이 필요한 요청인데 서버가 '로그인 안 됨'으로 답하면
    // (다른 탭에서 비밀번호 변경·로그아웃, 로그인 만료 등) 화면도 로그아웃 상태로 맞춤
    const url = error.config?.url ?? ''
    if (error.response?.status === 401 && !AUTH_CHECK_URLS.some((path) => url.startsWith(path))) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { message } }))
    }
    return Promise.reject(new Error(message))
  },
)

export default api
