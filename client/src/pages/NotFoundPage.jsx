import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section style={{ padding: '64px var(--header-gutter)', textAlign: 'center' }}>
      <h1 style={{ fontWeight: 400, fontSize: 18 }}>페이지를 찾을 수 없습니다</h1>
      <Link to="/" style={{ textDecoration: 'underline' }}>
        홈으로 돌아가기
      </Link>
    </section>
  )
}

export default NotFoundPage
