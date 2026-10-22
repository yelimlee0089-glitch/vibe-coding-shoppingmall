import { useCallback, useEffect, useMemo, useState } from 'react'
import * as cartApi from '@/api/cart'
import { useAuth } from './AuthContext'
import { CartContext } from './CartContext'

const EMPTY_CART = { items: [], totalQuantity: 0, totalAmount: 0 }

// 장바구니를 앱 전체(헤더의 CART 개수, 상품 상세, 장바구니 페이지)에서 함께 사용
function CartProvider({ children }) {
  const { user } = useAuth()
  const userId = user?._id
  // 어떤 회원의 장바구니인지 함께 저장 → 로그아웃하거나 다른 회원으로 바뀌면 자동으로 빈 장바구니
  const [loaded, setLoaded] = useState({ userId: null, cart: EMPTY_CART })
  const cart = userId && loaded.userId === userId ? loaded.cart : EMPTY_CART
  const isLoading = Boolean(userId) && loaded.userId !== userId

  // 로그인하면 내 장바구니를 불러옴
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    cartApi
      .getCart()
      .then((data) => !cancelled && setLoaded({ userId, cart: data }))
      .catch(() => !cancelled && setLoaded({ userId, cart: EMPTY_CART }))
    return () => {
      cancelled = true
    }
  }, [userId])

  // 서버 응답(변경된 장바구니 전체)으로 화면 상태를 맞춤
  const sync = useCallback(
    async (request) => {
      const data = await request
      setLoaded({ userId, cart: data })
      return data
    },
    [userId],
  )

  const value = useMemo(
    () => ({
      cart,
      isLoading,
      count: cart.totalQuantity,
      addItem: (item) => sync(cartApi.addCartItem(item)),
      updateQuantity: (itemId, quantity) => sync(cartApi.updateCartItem(itemId, quantity)),
      removeItem: (itemId) => sync(cartApi.removeCartItem(itemId)),
      clear: () => sync(cartApi.clearCart()),
      // 서버에서 장바구니가 바뀐 경우(결제 후 주문한 상품 제거 등) 다시 불러옴
      refresh: () => sync(cartApi.getCart()),
    }),
    [cart, isLoading, sync],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export default CartProvider
