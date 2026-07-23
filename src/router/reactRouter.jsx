import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom'

/* eslint-disable react-refresh/only-export-components */

import App from '@/App'
import { useAuthStore } from '@/stores/authStore'
import MigrationPlaceholder from '@/views/MigrationPlaceholder'
import EmotionView from '@/views/chat/EmotionView'
import JoinStep1View from '@/views/login/JoinStep1View'
import JoinStep2View from '@/views/login/JoinStep2View'
import JoinStep3View from '@/views/login/JoinStep3View'
import JoinStep4View from '@/views/login/JoinStep4View'
import LoginView from '@/views/login/LoginView'
import MainView from '@/views/main/MainView'

function pendingDestination(search) {
  const params = new URLSearchParams(search)
  const pendingJoin = params.get('pendingJoin') || sessionStorage.getItem('pendingJoin')
  const pendingInvite = params.get('pendingInvite') || sessionStorage.getItem('pendingInvite')

  if (pendingJoin) return `/exchange/join?token=${encodeURIComponent(pendingJoin)}`
  if (pendingInvite) return `/exchange?invite=${encodeURIComponent(pendingInvite)}`
  return '/main'
}

function LandingRoute() {
  const user = useAuthStore((state) => state.user)
  const isNewUser = useAuthStore((state) => state.isNewUser)
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const notificationTarget = params.get('notificationTarget')

  if (notificationTarget) return <Navigate replace to={notificationTarget} />
  if (!user) return <Navigate replace to="/login" />
  if (isNewUser()) return <Navigate replace to="/join/1" />
  return <Navigate replace to={pendingDestination(location.search)} />
}

function LoginRoute() {
  const user = useAuthStore((state) => state.user)
  const isNewUser = useAuthStore((state) => state.isNewUser)
  const location = useLocation()

  if (!user) return <LoginView />
  if (isNewUser()) return <Navigate replace to="/join/1" />
  return <Navigate replace to={pendingDestination(location.search)} />
}

function ProtectedRoute() {
  const user = useAuthStore((state) => state.user)
  const isNewUser = useAuthStore((state) => state.isNewUser)
  const location = useLocation()

  if (!user) {
    const invite = new URLSearchParams(location.search).get('invite')
    const loginPath = invite
      ? `/login?pendingInvite=${encodeURIComponent(invite)}`
      : '/login'
    return <Navigate replace to={loginPath} />
  }
  if (isNewUser()) return <Navigate replace to="/join/1" />
  return <Outlet />
}

function JoinRoute() {
  const user = useAuthStore((state) => state.user)
  const isNewUser = useAuthStore((state) => state.isNewUser)
  const location = useLocation()

  if (!user) return <Navigate replace to="/login" />
  if (!isNewUser()) return <Navigate replace to={pendingDestination(location.search)} />
  return <Outlet />
}

const protectedRoutes = [
  ['/chat', '/chat'],
  ['/chat/result', '/chat/result'],
  ['/advice', '/advice'],
  ['/report', '/report'],
  ['/exchange', '/exchange'],
  ['/exchange/write', '/exchange/write'],
  ['/exchange/view/:id', '/exchange/view/:id'],
  ['/exchange/room', '/exchange/room'],
  ['/my', '/my'],
  ['/my/databack', '/my/databack'],
  ['/my/chat-view', '/my/chat-view'],
]

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { index: true, element: <LandingRoute /> },
      { path: 'login', element: <LoginRoute /> },
      {
        element: <JoinRoute />,
        children: [
          { path: 'join/1', element: <JoinStep1View /> },
          { path: 'join/2', element: <JoinStep2View /> },
          { path: 'join/3', element: <JoinStep3View /> },
          { path: 'join/4', element: <JoinStep4View /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'main', element: <MainView /> },
          { path: 'chat/emotion', element: <EmotionView /> },
          ...protectedRoutes.map(([path, labelPath]) => ({
            path: path.slice(1),
            element: <MigrationPlaceholder path={labelPath} />,
          })),
        ],
      },
      {
        path: 'exchange/join',
        element: <MigrationPlaceholder path="/exchange/join" />,
      },
      { path: 'my/profile', element: <Navigate replace to="/my" /> },
      { path: '*', element: <Navigate replace to="/" /> },
    ],
  },
])

export default router
