import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ToastContext } from './ToastContext'
import styles from './Toast.module.css'

const DURATION_MS = 3000
const EXIT_MS = 250

// 화면 상단에 잠깐 나타났다 사라지는 알림 팝업
function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const timers = useRef([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const hide = useCallback(() => {
    clearTimers()
    setIsLeaving(true)
    timers.current.push(setTimeout(() => setToast(null), EXIT_MS))
  }, [])

  const show = useCallback(
    (message) => {
      clearTimers()
      setIsLeaving(false)
      // 같은 메시지를 연달아 띄워도 다시 나타나도록 id 부여
      setToast({ id: Date.now(), message })
      timers.current.push(setTimeout(hide, DURATION_MS))
    },
    [hide],
  )

  useEffect(() => clearTimers, [])

  const value = useMemo(() => ({ show, hide }), [show, hide])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`${styles.toast} ${isLeaving ? styles.leaving : ''}`}>
            <p className={styles.message}>{toast.message}</p>
            <button type="button" className={styles.close} aria-label="알림 닫기" onClick={hide}>
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
