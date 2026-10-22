import { ORDER_STATUS_LABELS } from '@/utils/format'
import styles from './Admin.module.css'

// 색만으로 구분하지 않도록 항상 글자로 상태를 표시
function StatusBadge({ status }) {
  return (
    <span className={styles.badge} data-status={status}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export default StatusBadge
