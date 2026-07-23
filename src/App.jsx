import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'
import '@/assets/scss/react-shell.scss'

function App() {
  const init = useAuthStore((state) => state.init)
  const loading = useAuthStore((state) => state.loading)
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pendingJoin = params.get('pendingJoin')
    const pendingInvite = params.get('pendingInvite')

    // OAuth가 루트로 돌아온 뒤에도 신규 사용자 가입 과정에서 초대 목적지를 유지한다.
    if (pendingJoin) sessionStorage.setItem('pendingJoin', pendingJoin)
    if (pendingInvite) sessionStorage.setItem('pendingInvite', pendingInvite)
    init()
  }, [init])

  useEffect(() => {
    function dismissToast() {
      setToast(null)
      window.clearTimeout(toastTimer.current)
    }

    function showToast(data) {
      setToast(data)
      window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(dismissToast, 5000)
    }

    function onServiceWorkerMessage(event) {
      if (event.data?.type === 'PUSH') showToast(event.data)
    }

    async function clearBadge() {
      if ('clearAppBadge' in navigator) {
        try {
          await navigator.clearAppBadge()
        } catch {
          // Badge support varies by browser and install mode.
        }
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') clearBadge()
    }

    clearBadge()
    window.addEventListener('focus', clearBadge)
    document.addEventListener('visibilitychange', onVisibilityChange)
    navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage)

    return () => {
      window.clearTimeout(toastTimer.current)
      window.removeEventListener('focus', clearBadge)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      navigator.serviceWorker?.removeEventListener('message', onServiceWorkerMessage)
    }
  }, [])

  if (loading) return <SplashScreen />

  function openToastTarget() {
    if (toast?.url) navigate(toast.url)
    setToast(null)
    window.clearTimeout(toastTimer.current)
  }

  return (
    <>
      <Outlet />
      {toast && (
        <div className="app-toast" role="alert" onClick={openToastTarget}>
          <div className="app-toast__icon">🔔</div>
          <div className="app-toast__body">
            <p className="app-toast__title">{toast.title}</p>
            <p className="app-toast__desc">{toast.body}</p>
          </div>
          <button
            type="button"
            className="app-toast__close"
            aria-label="알림 닫기"
            onClick={(event) => {
              event.stopPropagation()
              setToast(null)
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}

export function SplashScreen() {
  return (
    <div className="wrap splash">
      <main className="splash">
        <div className="splash-content">
          <img
            src="/assets/img/main/img-splash.gif"
            alt="안다미로"
            className="splash-logo"
          />
        </div>
      </main>
    </div>
  )
}

export default App
