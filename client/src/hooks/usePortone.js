import { useEffect, useState } from 'react'

const SDK_URL = 'https://cdn.iamport.kr/v1/iamport.js'
// 포트원 관리자 콘솔의 '고객사 식별코드' (브라우저에 공개되는 값이라 .env 에 둬도 됨)
const IMP_CODE = import.meta.env.VITE_PORTONE_IMP_CODE

export const isPortoneConfigured = Boolean(IMP_CODE)
// 사용할 PG 채널 (포트원 콘솔에 등록된 채널). 기본: KG이니시스 테스트
export const PORTONE_PG = import.meta.env.VITE_PORTONE_PG || 'html5_inicis.INIpayTest'

// 우리 결제수단 → 포트원 pay_method. 현재 채널(KG이니시스)에서 쓰는 것만
// (카카오페이·네이버페이·토스페이는 포트원에 각 간편결제 채널을 추가한 뒤 여기에 연결)
export const PORTONE_PAY_METHODS = {
  card: 'card',
  bank_transfer: 'trans',
}

/**
 * 결제창을 열고 결과를 Promise 로 돌려줌
 * - 성공: { impUid, merchantUid }
 * - 실패·사용자 취소: Error (message 에 포트원이 준 사유)
 * 모바일은 결제 후 m_redirect_url 로 페이지가 이동하므로 이 Promise 가 끝나지 않을 수 있음
 */
export function requestPay(IMP, params) {
  return new Promise((resolve, reject) => {
    IMP.request_pay(params, (rsp) => {
      // v1 SDK: 실패 시 error_code/error_msg, 예전 방식은 success=false
      if (rsp.error_code || rsp.success === false || !rsp.imp_uid) {
        reject(new Error(rsp.error_msg || '결제가 취소되었습니다.'))
      } else {
        resolve({ impUid: rsp.imp_uid, merchantUid: rsp.merchant_uid })
      }
    })
  })
}

// SDK 스크립트는 처음 필요할 때 한 번만 불러옴
let sdkPromise
function loadSdk() {
  if (window.IMP) return Promise.resolve(window.IMP)
  sdkPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onload = () => (window.IMP ? resolve(window.IMP) : reject(new Error('포트원 결제 모듈을 찾을 수 없습니다.')))
    script.onerror = () => {
      sdkPromise = undefined
      reject(new Error('포트원 결제 모듈을 불러오지 못했습니다. 네트워크를 확인해 주세요.'))
    }
    document.head.appendChild(script)
  })
  return sdkPromise
}

// 같은 고객사 코드로 여러 번 초기화하지 않도록
let initializedCode = null

/**
 * 포트원(아임포트 v1) 결제 모듈을 불러오고 IMP.init(고객사 식별코드)으로 초기화
 * 반환: { IMP, isReady, error } — isReady 가 true 가 된 뒤 IMP.request_pay(...) 사용
 */
export function usePortone() {
  const [state, setState] = useState(() =>
    window.IMP && initializedCode === IMP_CODE
      ? { IMP: window.IMP, isReady: true, error: '' }
      : { IMP: null, isReady: false, error: isPortoneConfigured ? '' : 'VITE_PORTONE_IMP_CODE 가 설정되지 않았습니다.' },
  )

  useEffect(() => {
    if (!isPortoneConfigured || state.isReady) return
    let cancelled = false

    loadSdk()
      .then((IMP) => {
        if (initializedCode !== IMP_CODE) {
          IMP.init(IMP_CODE)
          initializedCode = IMP_CODE
        }
        if (!cancelled) setState({ IMP, isReady: true, error: '' })
      })
      .catch((err) => !cancelled && setState({ IMP: null, isReady: false, error: err.message }))

    return () => {
      cancelled = true
    }
  }, [state.isReady])

  return state
}
