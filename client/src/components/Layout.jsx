import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'

function Layout() {
  // 메인 페이지에서는 헤더가 화면 위에 떠 있음
  const isHome = useLocation().pathname === '/'

  return (
    <>
      <Header overlay={isHome} />
      <main>
        <Outlet />
      </main>
    </>
  )
}

export default Layout
