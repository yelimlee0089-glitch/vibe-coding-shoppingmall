import { isCloudinaryConfigured, useCloudinaryWidget } from '@/hooks/useCloudinaryWidget'
import styles from './Admin.module.css'

// Cloudinary 위젯으로 이미지를 올리고, 올린 이미지를 미리보기로 보여줌
function ImageUploadField({ value, onChange, error }) {
  const { open, isReady, error: uploadError } = useCloudinaryWidget({
    onUpload: ({ url, publicId }) => onChange({ imageUrl: url, imagePublicId: publicId }),
  })

  const message = error || uploadError
  const describedBy = message ? 'product-image-error' : undefined

  return (
    <div className={styles.formRow}>
      <span className={styles.fieldLabel} id="product-image-label">
        상품 이미지
      </span>

      {value ? (
        <div className={styles.imagePreview}>
          <img src={value} alt="업로드한 상품 이미지 미리보기" />
          <div className={styles.imagePreviewActions}>
            <button type="button" className={styles.secondaryButton} onClick={open} disabled={!isReady}>
              이미지 변경
            </button>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => onChange({ imageUrl: '', imagePublicId: '' })}
            >
              삭제
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.uploadBox}
          onClick={open}
          disabled={!isReady}
          aria-labelledby="product-image-label"
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
        >
          <span className={styles.uploadIcon} aria-hidden="true">
            +
          </span>
          <span>{isReady ? '이미지 업로드' : isCloudinaryConfigured ? '업로드 준비 중...' : '업로드 설정 필요'}</span>
          <span className={styles.hint}>JPG · PNG · WEBP, 5MB 이하</span>
        </button>
      )}

      {!isCloudinaryConfigured && (
        <p className={styles.hint}>
          client/.env 에 VITE_CLOUDINARY_CLOUD_NAME 과 VITE_CLOUDINARY_UPLOAD_PRESET 을 설정해 주세요.
        </p>
      )}
      {message && (
        <p id="product-image-error" className={styles.fieldError}>
          {message}
        </p>
      )}
    </div>
  )
}

export default ImageUploadField
