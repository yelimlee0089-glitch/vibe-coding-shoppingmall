import api from './client'

export const getStats = () => api.get('/admin/stats')
export const getOrders = (params) => api.get('/admin/orders', { params })
export const updateOrderStatus = (id, status) => api.patch(`/admin/orders/${id}/status`, { status })
export const getSales = (days) => api.get('/admin/sales', { params: { days } })
export const getCustomers = (q) => api.get('/admin/customers', { params: q ? { q } : {} })
