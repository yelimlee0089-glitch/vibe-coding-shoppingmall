import { Link } from 'react-router-dom'
import { createProduct } from '@/api/products'
import { useToast } from '@/contexts/ToastContext'
import { PRODUCT_LIST_PATH } from './AdminPage'
import ProductForm from './ProductForm'
import styles from './Admin.module.css'

function ProductNewPage() {
  const toast = useToast()

  const handleSubmit = async (payload) => {
    const product = await createProduct(payload)
    toast.show(`'${product.name}' 상품이 등록되었습니다`)
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <Link to="/admin" className={styles.backLink}>
          ← 관리자 대시보드
        </Link>
        <div className={styles.sectionHeader}>
          <h1 className={styles.pageTitle}>{'{새 상품 등록}'}</h1>
          <Link to={PRODUCT_LIST_PATH} className={styles.secondaryButton}>
            등록 상품 보기
          </Link>
        </div>
        <p className={styles.muted}>등록한 상품은 바로 쇼핑몰에 노출됩니다.</p>
      </div>

      <ProductForm onSubmit={handleSubmit} submitLabel="상품 등록" submittingLabel="등록 중..." resetOnSuccess />
    </section>
  )
}

export default ProductNewPage
