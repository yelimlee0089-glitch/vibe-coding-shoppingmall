import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// 관리자만 들어갈 수 있는 페이지들을 감싸는 경로
function RequireAdmin() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null
  // 로그인하지 않았으면 로그인 후 원래 보려던 페이지로 돌아오도록
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  // 주소를 직접 입력해 들어온 일반 회원은 홈으로
  if (user.user_type !== 'admin') return <Navigate to="/" replace />

  return <Outlet />
}

export default RequireAdmin
