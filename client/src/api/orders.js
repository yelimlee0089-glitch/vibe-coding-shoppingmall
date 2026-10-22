import api from './client'

export const createOrder = ({ shipping, paymentMethod }) =>
  api.post('/orders', { shipping, payment: { method: paymentMethod } })
// 결제 완료 처리: impUid(포트원 결제번호)를 보내면 서버가 포트원에 직접 조회해서 검증
// impUid 없이 부르면 서버가 개발용 모의 결제로 처리 (포트원 키가 없는 개발 환경에서만)
export const payOrder = (id, impUid) => api.post(`/orders/${id}/pay`, impUid ? { impUid } : {})
// 서버의 결제 방식: { provider: 'portone' | 'mock' | 'unavailable' }
export const getPaymentConfig = () => api.get('/payments/config')
export const getMyOrders = (params) => api.get('/orders', { params })
export const getOrder = (id) => api.get(`/orders/${id}`)
export const updateOrderShipping = (id, shipping) => api.patch(`/orders/${id}`, { shipping })
export const cancelOrder = (id, reason) => api.delete(`/orders/${id}`, { data: { reason } })
