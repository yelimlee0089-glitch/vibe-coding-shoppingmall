import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as authApi from '@/api/auth'
import { UNAUTHORIZED_EVENT } from '@/api/client'
import { useToast } from './ToastContext'
import { AuthContext } from './AuthContext'

// 로그인한 사용자 정보를 앱 전체에서 사용할 수 있게 함
// 토큰은 서버가 httpOnly 쿠키로 관리하므로 여기서는 사용자 정보만 보관
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 첫 화면에서 쿠키로 로그인 상태를 확인하는 중인지
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()
  // 이벤트 처리에서 최신 로그인 상태를 읽기 위한 값
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

  // 새로고침해도 로그인 상태가 유지되도록, 앱 시작 시 서버에 내 정보를 물어봄
  useEffect(() => {
    authApi
      .getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  // 서버가 '로그인 안 됨'(401)으로 답하면 화면도 로그아웃 상태로 바꿈
  // → RequireAuth·RequireAdmin 이 로그인 화면으로 보내고, 로그인 후 원래 페이지로 돌아옴
  useEffect(() => {
    const handleUnauthorized = (event) => {
      // 로그인된 것으로 보이던 상태에서만 안내 (이미 로그아웃 상태면 조용히 무시)
      if (userRef.current) toast.show(event.detail?.message || '로그인이 필요합니다. 다시 로그인해 주세요.')
      userRef.current = null
      setUser(null)
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [toast])

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      // 서버 요청이 실패해도 화면에서는 로그아웃 처리
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, isLoggedIn: Boolean(user), login, logout }),
    [user, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
