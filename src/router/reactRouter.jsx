import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom'

/* eslint-disable react-refresh/only-export-components */

import App from '@/App'
import { useAuthStore } from '@/stores/authStore'
import MigrationPlaceholder from '@/views/MigrationPlaceholder'
import LoginView from '@/views/login/LoginView'

const JOIN_PATHS = ['/join/1', '/join/2', '/join/3', '/join/4']

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

function JoinRoute({ path }) {
  const user = useAuthStore((state) => state.user)
  const isNewUser = useAuthStore((state) => state.isNewUser)
  const location = useLocation()

  if (!user) return <Navigate replace to="/login" />
  if (!isNewUser()) return <Navigate replace to={pendingDestination(location.search)} />
  return <MigrationPlaceholder path={path} />
}

const protectedRoutes = [
  ['/main', '/main'],
  ['/chat', '/chat'],
  ['/chat/emotion', '/chat/emotion'],
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
      ...JOIN_PATHS.map((path) => ({
        path: path.slice(1),
        element: <JoinRoute path={path} />,
      })),
      {
        element: <ProtectedRoute />,
        children: protectedRoutes.map(([path, labelPath]) => ({
          path: path.slice(1),
          element: <MigrationPlaceholder path={labelPath} />,
        })),
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
