import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
