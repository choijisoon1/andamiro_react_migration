import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'
import '@/assets/scss/react-shell.scss'

function App() {
  const init = useAuthStore((state) => state.init)
  const loading = useAuthStore((state) => state.loading)
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)
  const [toastOpen, setToastOpen] = useState(false)
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
      setToastOpen(false)
      window.clearTimeout(toastTimer.current)
    }

    function showToast(data) {
      setToast(data)
      setToastOpen(true)
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

  if (loading) return <AppLoadingScreen />

  function openToastTarget() {
    if (toast?.url) navigate(toast.url)
    setToastOpen(false)
    window.clearTimeout(toastTimer.current)
  }

  return (
    <>
      <Outlet />
      <AppToast
        show={toastOpen}
        onClick={openToastTarget}
        onAnimationEnd={() => {
          if (!toastOpen) setToast(null)
        }}
      >
        {toast && (
          <>
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
                setToastOpen(false)
              }}
            >
              ✕
            </button>
          </>
        )}
      </AppToast>
    </>
  )
}

function AppToast({ show, onClick, onAnimationEnd, children }) {
  const [presence, setPresence] = useState({ show, leaving: false })

  if (presence.show !== show) {
    // Vue의 toast Transition과 같은 0.3초 퇴장 동작을 보장한다.
    setPresence({ show, leaving: !show })
  }

  if (!show && !presence.leaving) return null

  return (
    <div
      className={`app-toast ${show ? 'is-entering' : 'is-leaving'}`}
      role="alert"
      onClick={onClick}
      onAnimationEnd={(event) => {
        if (!show && event.target === event.currentTarget) {
          setPresence({ show: false, leaving: false })
          onAnimationEnd?.()
        }
      }}
    >
      {children}
    </div>
  )
}

function AppLoadingScreen() {
  return (
    <div className="app-loading">
      <div className="app-loading__inner">
        <img src="/assets/img/main/img-splash.gif" alt="안다미로" />
      </div>
    </div>
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
