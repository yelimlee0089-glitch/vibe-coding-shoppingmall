import axios from 'axios'

// 주소에 슬래시가 겹쳐 들어가도(예: https://서버.com//api/) 한 개로 정리
const normalizeBaseUrl = (url) => url.replace(/([^:/])\/{2,}/g, '$1/').replace(/\/+$/, '')

const api = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || '/api'),
  headers: { 'Content-Type': 'application/json' },
  // 로그인 쿠키를 요청에 함께 보냄
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message
    return Promise.reject(new Error(message))
  },
)

export default api
