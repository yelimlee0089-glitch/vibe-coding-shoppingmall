import api from './client'

export const login = (credentials) => api.post('/auth/login', credentials)
export const logout = () => api.post('/auth/logout')
export const getMe = () => api.get('/auth/me')

// 비밀번호 찾기: 재설정 링크 메일 요청 → 메일 링크의 token 으로 새 비밀번호 설정
export const requestPasswordReset = (email) => api.post('/auth/forgot-password', { email })
export const resetPassword = (token, password) => api.post('/auth/reset-password', { token, password })
