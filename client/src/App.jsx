import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import RequireAdmin from '@/components/RequireAdmin'
import RequireAuth from '@/components/RequireAuth'
import AuthProvider from '@/contexts/AuthProvider'
import CartProvider from '@/contexts/CartProvider'
import ToastProvider from '@/contexts/ToastProvider'
import AdminPage from '@/pages/admin/AdminPage'
import ProductEditPage from '@/pages/admin/ProductEditPage'
import ProductListPage from '@/pages/admin/ProductListPage'
import ProductNewPage from '@/pages/admin/ProductNewPage'
import CartPage from '@/pages/CartPage'
import CheckoutPage from '@/pages/CheckoutPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import MyOrdersPage from '@/pages/MyOrdersPage'
import NotFoundPage from '@/pages/NotFoundPage'
import OrderCompletePage from '@/pages/OrderCompletePage'
import PaymentResultPage from '@/pages/PaymentResultPage'
import ProductDetailPage from '@/pages/ProductDetailPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import ShopPage from '@/pages/ShopPage'
import SignupPage from '@/pages/SignupPage'

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<MyOrdersPage />} />
                <Route path="/orders/:id" element={<OrderCompletePage variant="detail" />} />
                <Route path="/orders/:id/complete" element={<OrderCompletePage />} />
                <Route path="/orders/:id/payment-result" element={<PaymentResultPage />} />
              </Route>
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/products" element={<ProductListPage />} />
                <Route path="/admin/products/new" element={<ProductNewPage />} />
                <Route path="/admin/products/:id/edit" element={<ProductEditPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
