import api from './client'

// 모든 요청은 변경된 장바구니 전체를 돌려줌
// { items: [{ _id, product, size, quantity, subtotal }], totalQuantity, totalAmount }
export const getCart = () => api.get('/cart')
export const addCartItem = ({ productId, size, quantity = 1 }) =>
  api.post('/cart/items', { productId, size, quantity })
export const updateCartItem = (itemId, quantity) => api.patch(`/cart/items/${itemId}`, { quantity })
export const removeCartItem = (itemId) => api.delete(`/cart/items/${itemId}`)
export const clearCart = () => api.delete('/cart')
