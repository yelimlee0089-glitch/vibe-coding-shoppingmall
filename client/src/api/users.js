import api from './client'

export const createUser = (data) => api.post('/users', data)
