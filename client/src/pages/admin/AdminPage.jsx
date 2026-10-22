import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import CustomersPanel from './CustomersPanel'
import OrdersPanel from './OrdersPanel'
import OverviewPanel from './OverviewPanel'
import SalesPanel from './SalesPanel'
import styles from './Admin.module.css'

export const NEW_PRODUCT_PATH = '/admin/products/new'
export const PRODUCT_LIST_PATH = '/admin/products'

// 별도 페이지로 이동하는 메뉴
const PAGE_LINKS = {
  products: NEW_PRODUCT_PATH,
  productList: PRODUCT_LIST_PATH,
}

const ADMIN_TABS = [
  { id: 'overview', label: '대시보드' },
  { id: 'productList', label: '등록 상품' },
  { id: 'products', label: '상품 등록' },
  { id: 'orders', label: '주문 관리' },
  { id: 'sales', label: '매출 분석' },
  { id: 'customers', label: '고객 관리' },
]

const PANELS = {
  overview: OverviewPanel,
  orders: OrdersPanel,
  sales: SalesPanel,
  customers: CustomersPanel,
}

function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  // 선택한 탭을 주소(?tab=)에 저장해서 새로고침·뒤로가기에도 유지
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')

  // 예전 주소(?tab=products)로 들어오면 상품 등록 페이지로
  if (requestedTab === 'products') return <Navigate to={NEW_PRODUCT_PATH} replace />

  const tab = PANELS[requestedTab] ? requestedTab : 'overview'
  const Panel = PANELS[tab]

  const goTo = (id) => {
    // 상품 목록·상품 등록은 별도 페이지
    if (PAGE_LINKS[id]) {
      navigate(PAGE_LINKS[id])
    } else {
      setSearchParams(id === 'overview' ? {} : { tab: id })
    }
    window.scrollTo({ top: 0 })
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{'{Admin}'}</h1>
        <p className={styles.muted}>{user.name}님, 오늘도 좋은 하루 보내세요.</p>
      </div>

      <nav className={styles.tabs} aria-label="관리자 메뉴">
        {ADMIN_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.tab}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => goTo(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <Panel onNavigate={goTo} />
    </section>
  )
}

export default AdminPage
