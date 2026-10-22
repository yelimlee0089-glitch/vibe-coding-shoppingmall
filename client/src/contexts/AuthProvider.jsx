import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '@/api/auth'
import { AuthContext } from './AuthContext'

// 로그인한 사용자 정보를 앱 전체에서 사용할 수 있게 함
// 토큰은 서버가 httpOnly 쿠키로 관리하므로 여기서는 사용자 정보만 보관
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 첫 화면에서 쿠키로 로그인 상태를 확인하는 중인지
  const [isLoading, setIsLoading] = useState(true)

  // 새로고침해도 로그인 상태가 유지되도록, 앱 시작 시 서버에 내 정보를 물어봄
  useEffect(() => {
    authApi
      .getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

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
