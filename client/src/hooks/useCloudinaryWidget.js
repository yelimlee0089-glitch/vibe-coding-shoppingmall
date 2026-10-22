import { useCallback, useEffect, useRef, useState } from 'react'

const SCRIPT_URL = 'https://upload-widget.cloudinary.com/latest/global/all.js'
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET)

// 위젯 스크립트는 처음 필요할 때 한 번만 불러옴
let scriptPromise
function loadWidgetScript() {
  if (window.cloudinary?.createUploadWidget) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = resolve
    script.onerror = () => {
      scriptPromise = undefined
      reject(new Error('Cloudinary 업로드 위젯을 불러오지 못했습니다. 네트워크를 확인해 주세요.'))
    }
    document.body.appendChild(script)
  })
  return scriptPromise
}

/**
 * Cloudinary 업로드 위젯을 열고, 업로드가 끝나면 onUpload({ url, publicId, width, height })를 호출
 * - 서명 없는(unsigned) 업로드 프리셋을 사용하므로 API Secret 이 브라우저에 노출되지 않음
 */
export function useCloudinaryWidget({ onUpload, folder = 'products' }) {
  const widgetRef = useRef(null)
  const onUploadRef = useRef(onUpload)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    onUploadRef.current = onUpload
  }, [onUpload])

  useEffect(() => {
    if (!isCloudinaryConfigured) return
    let cancelled = false

    loadWidgetScript()
      .then(() => {
        if (cancelled) return
        widgetRef.current = window.cloudinary.createUploadWidget(
          {
            cloudName: CLOUD_NAME,
            uploadPreset: UPLOAD_PRESET,
            folder,
            sources: ['local', 'url', 'camera'],
            multiple: false,
            maxFiles: 1,
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
            maxImageFileSize: 5 * 1024 * 1024,
            showPoweredBy: false,
          },
          (uploadError, result) => {
            if (uploadError) {
              setError(uploadError.statusText || uploadError.message || '이미지 업로드에 실패했습니다.')
              return
            }
            if (result?.event === 'success') {
              setError('')
              const { secure_url: url, public_id: publicId, width, height } = result.info
              onUploadRef.current?.({ url, publicId, width, height })
            }
          },
        )
        setIsReady(true)
      })
      .catch((err) => !cancelled && setError(err.message))

    return () => {
      cancelled = true
      widgetRef.current?.destroy?.()
      widgetRef.current = null
      setIsReady(false)
    }
  }, [folder])

  const open = useCallback(() => {
    setError('')
    widgetRef.current?.open()
  }, [])

  return { open, isReady, error }
}
