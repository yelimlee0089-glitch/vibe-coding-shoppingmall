export const formatPrice = (value) => `₩${Number(value).toLocaleString('ko-KR')}`

export const formatNumber = (value) => Number(value).toLocaleString('ko-KR')

// 축 눈금용 짧은 금액 (예: 1200000 → 120만)
export function formatCompactWon(value) {
  if (value >= 100_000_000) return `${+(value / 100_000_000).toFixed(1)}억`
  if (value >= 10_000) return `${+(value / 10_000).toFixed(0)}만`
  return formatNumber(value)
}

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'

export const formatDateTime = (value) =>
  new Date(value).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

// 관리자 화면용 주문 상태 이름
export const ORDER_STATUS_LABELS = {
  pending: '결제 대기',
  paid: '결제 완료',
  shipped: '배송 중',
  delivered: '배송 완료',
  cancelled: '주문 취소',
}

// 서버(orderController)의 배송비 정책과 같은 값: 5만 원 이상 무료, 미만 3,000원
// 화면 미리보기용이며 실제 금액은 주문할 때 서버가 다시 계산함
export const FREE_SHIPPING_THRESHOLD = 50000
export const SHIPPING_FEE = 3000
export const calculateShippingFee = (itemsTotal) => (itemsTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE)

export const PAYMENT_METHOD_LABELS = {
  card: '신용·체크카드',
  bank_transfer: '계좌이체',
  kakaopay: '카카오페이',
  naverpay: '네이버페이',
  tosspay: '토스페이',
}

// 고객 화면용 주문 상태 이름 (내 주문 목록·주문 상세)
export const CUSTOMER_ORDER_STATUS_LABELS = {
  pending: '결제 대기',
  paid: '상품 처리중',
  shipped: '배송중',
  delivered: '배송 완료',
  cancelled: '주문 취소',
}
