import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import styles from './Header.module.css'

// 로그인 상태에 따라 바뀌는 메뉴: 관리자 / 로그인 / 사용자 이름 / 로그아웃
function AccountItems({ onNavigate }) {
  const { user, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    onNavigate?.()
    // 먼저 홈으로 이동한 뒤 로그아웃
    // (장바구니처럼 로그인이 필요한 페이지에서 로그아웃하면 로그인 화면으로 튕기는 것 방지)
    navigate('/')
    await logout()
  }

  // 로그인 상태 확인 중에는 Login 버튼이 잠깐 보였다 사라지지 않도록 비워 둠
  if (isLoading) return null

  if (!user) {
    return (
      <li>
        <NavLink to="/login" onClick={onNavigate}>
          Login
        </NavLink>
      </li>
    )
  }

  return (
    <>
      {/* 관리자 권한이 있는 사용자에게만 보임 */}
      {user.user_type === 'admin' && (
        <li>
          <NavLink to="/admin" onClick={onNavigate}>
            Admin
          </NavLink>
        </li>
      )}
      <li>
        <NavLink to="/orders" end onClick={onNavigate} className={styles.userName} title="내 주문">
          {user.name}님
        </NavLink>
      </li>
      <li>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </li>
    </>
  )
}

// 담은 수량이 있으면 CART (3) 처럼 표시
function CartLink({ onNavigate }) {
  const { count } = useCart()
  return (
    <NavLink to="/cart" onClick={onNavigate} aria-label={count > 0 ? `장바구니, ${count}개 담김` : '장바구니'}>
      Cart{count > 0 && ` (${count})`}
    </NavLink>
  )
}

function Header({ overlay = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <header className={`${styles.header} ${overlay ? styles.overlay : ''}`}>
      <Link to="/" className={styles.wordmark}>
        LIMSTAGE
      </Link>

      <nav className={styles.nav} aria-label="주 메뉴">
        <ul className={styles.primary}>
          <li>
            <NavLink to="/shop">Wellness Shop</NavLink>
          </li>
        </ul>
        <ul className={styles.secondary}>
          <AccountItems />
          <li>
            <CartLink />
          </li>
        </ul>
      </nav>

      <button
        type="button"
        className={styles.menuButton}
        aria-expanded={isMenuOpen}
        aria-controls="mobile-menu"
        onClick={() => setIsMenuOpen(true)}
      >
        Menu
      </button>

      <div
        id="mobile-menu"
        className={`${styles.drawer} ${isMenuOpen ? styles.drawerOpen : ''}`}
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
      >
        <div className={styles.drawerTop}>
          <Link to="/" className={styles.wordmark} onClick={closeMenu}>
            LIMSTAGE
          </Link>
          <button type="button" className={styles.menuButton} onClick={closeMenu}>
            Close
          </button>
        </div>
        <ul className={styles.drawerList}>
          <li>
            <NavLink to="/shop" onClick={closeMenu}>
              Wellness Shop
            </NavLink>
          </li>
          <AccountItems onNavigate={closeMenu} />
          <li>
            <CartLink onNavigate={closeMenu} />
          </li>
        </ul>
      </div>
    </header>
  )
}

export default Header
