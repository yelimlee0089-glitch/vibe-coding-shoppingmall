import api from './client'

// 응답: { products, pagination: { page, limit, total, totalPages, hasPrevPage, hasNextPage } }
export const getProducts = (params) => api.get('/products', { params })

// 관리자 목록처럼 전체가 필요할 때: 한 번에 최대 100개씩 모든 페이지를 모아서 반환
export async function getAllProducts() {
  const first = await getProducts({ page: 1, limit: 100 })
  const rest = await Promise.all(
    Array.from({ length: first.pagination.totalPages - 1 }, (_, i) =>
      getProducts({ page: i + 2, limit: 100 }),
    ),
  )
  return [first, ...rest].flatMap((result) => result.products)
}

export const getProduct = (id) => api.get(`/products/${id}`)
export const createProduct = (data) => api.post('/products', data)
export const updateProduct = (id, data) => api.patch(`/products/${id}`, data)
export const deleteProduct = (id) => api.delete(`/products/${id}`)
