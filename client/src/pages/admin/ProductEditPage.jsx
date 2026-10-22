import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getProduct, updateProduct } from '@/api/products'
import { useToast } from '@/contexts/ToastContext'
import { formatDate } from '@/utils/format'
import { PRODUCT_LIST_PATH } from './AdminPage'
import ProductForm from './ProductForm'
import { productToForm } from './productFormValues'
import styles from './Admin.module.css'

function ProductEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    getProduct(id)
      .then(setProduct)
      .catch((err) => setLoadError(err.message))
  }, [id])

  const handleSubmit = async (payload) => {
    const updated = await updateProduct(id, payload)
    toast.show(`'${updated.name}' 상품을 수정했습니다`)
    navigate(PRODUCT_LIST_PATH)
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <Link to={PRODUCT_LIST_PATH} className={styles.backLink}>
          ← 등록 상품
        </Link>
        <h1 className={styles.pageTitle}>{'{상품 수정}'}</h1>
        {product && (
          <p className={styles.muted}>
            {product.sku} · {formatDate(product.createdAt)} 등록 · 마지막 수정 {formatDate(product.updatedAt)}
          </p>
        )}
      </div>

      {loadError && (
        <div className={styles.emptyState}>
          <p>{loadError}</p>
          <Link to={PRODUCT_LIST_PATH} className={styles.textButton}>
            등록 상품 목록으로
          </Link>
        </div>
      )}
      {!product && !loadError && <p className={styles.muted}>상품 정보를 불러오는 중...</p>}

      {product && (
        <ProductForm
          // 다른 상품으로 이동하면 폼을 새로 그림
          key={product._id}
          initialValues={productToForm(product)}
          onSubmit={handleSubmit}
          submitLabel="수정 저장"
          submittingLabel="저장 중..."
          secondaryAction={
            <Link to={PRODUCT_LIST_PATH} className={styles.secondaryButton}>
              취소
            </Link>
          }
        />
      )}
    </section>
  )
}

export default ProductEditPage
