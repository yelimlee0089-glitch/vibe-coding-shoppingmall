import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// 로그인한 회원만 들어갈 수 있는 페이지들을 감싸는 경로
function RequireAuth() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null
  // 로그인 후 원래 보려던 페이지로 돌아오도록
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />

  return <Outlet />
}

export default RequireAuth
