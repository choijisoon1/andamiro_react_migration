import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'
import './LoginView.scss'

let deferredInstallPrompt = null

function LoginView() {
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)
  const location = useLocation()
  const [error, setError] = useState('')
  const [isWebView] = useState(() => {
    const userAgent = navigator.userAgent
    return /KAKAOTALK|NAVER|Instagram|FB_IAB|FBAN/i.test(userAgent)
      || (/Android/.test(userAgent) && /; wv\)/.test(userAgent))
  })
  const [isIOS] = useState(() => {
    const userAgent = navigator.userAgent
    return /iPhone|iPad/i.test(userAgent)
      && /WebKit/i.test(userAgent)
      && !/CriOS|FxiOS/i.test(userAgent)
  })
  const [canInstall, setCanInstall] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)

  useEffect(() => {
    function onInstallPrompt(event) {
      event.preventDefault()
      deferredInstallPrompt = event
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onInstallPrompt)
  }, [])

  async function handleGoogleLogin() {
    const params = new URLSearchParams(location.search)
    const pendingInvite = params.get('pendingInvite')
      || sessionStorage.getItem('pendingInvite')
      || null

    try {
      setError('')
      await signInWithGoogle(null, pendingInvite)
    } catch {
      setError('구글 로그인에 실패했습니다.')
    }
  }

  async function installApp() {
    if (!deferredInstallPrompt) return
    deferredInstallPrompt.prompt()
    await deferredInstallPrompt.userChoice
    deferredInstallPrompt = null
    setCanInstall(false)
  }

  return (
    <div className="wrap">
      <div id="bodyWrap" className="login">
        <main>
          <section className="importance-content">
            <div className="text-content">
              <div className="text-group">
                <em>하루의 시작과 마무리를<br />함께 만들어요!</em>
                <span>대화하며 쉽게 기록하고 함께 기록된<br />AI 인사이트를 확인해 보세요</span>
              </div>
            </div>
            <div className="img-content"><p /></div>
          </section>
        </main>

        <footer className="button-ctp">
          <div className="button-content">
            {isWebView && (
              <div className="login-webview-warn">
                <p className="login-webview-warn__title">⚠️ 구글 로그인이 지원되지 않아요</p>
                <p className="login-webview-warn__desc">
                  카카오톡·네이버 등 앱 내 브라우저에서는 구글 로그인을 할 수 없어요.<br />
                  하단 메뉴의 <strong>다른 브라우저로 열기</strong>를 눌러주세요.
                </p>
              </div>
            )}

            {error && <p className="login-error">{error}</p>}
            <button
              id="loginGoogleBtn"
              type="button"
              className="btn-line ico-google"
              disabled={isWebView}
              onClick={handleGoogleLogin}
            >
              Google 로그인
            </button>

            {canInstall && (
              <button type="button" className="btn-install" onClick={installApp}>
                📲 홈 화면에 앱 추가하기
              </button>
            )}
            {!canInstall && isIOS && (
              <button
                type="button"
                className="btn-install btn-install--ios"
                onClick={() => setShowIOSHint((visible) => !visible)}
              >
                📲 홈 화면에 앱 추가하기
              </button>
            )}
            {showIOSHint && (
              <div className="login-ios-hint">
                <p>① 하단 공유 버튼 <strong>[ ]↑</strong> 탭</p>
                <p>② <strong>홈 화면에 추가</strong> 선택</p>
                <p>③ 설치 후 앱 아이콘으로 열면 알림도 받을 수 있어요 🔔</p>
              </div>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}

export default LoginView
