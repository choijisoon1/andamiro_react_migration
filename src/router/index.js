import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',             name: 'splash',    component: () => import('@/views/SplashView.vue') },
    { path: '/login',        name: 'login',     component: () => import('@/views/login/LoginView.vue') },
    { path: '/join/1',       name: 'join-1',    component: () => import('@/views/login/JoinStep1View.vue') },
    { path: '/join/2',       name: 'join-2',    component: () => import('@/views/login/JoinStep2View.vue') },
    { path: '/join/3',       name: 'join-3',    component: () => import('@/views/login/JoinStep3View.vue') },
    { path: '/join/4',       name: 'join-4',    component: () => import('@/views/login/JoinStep4View.vue') },
    {
      path: '/main',         name: 'main',      component: () => import('@/views/main/MainView.vue'),      meta: { requiresAuth: true },
    },
    {
      path: '/chat',         name: 'chat',      component: () => import('@/views/chat/ChatView.vue'), meta: { requiresAuth: true },
    },
    {
      path: '/chat/emotion', name: 'emotion',   component: () => import('@/views/chat/EmotionView.vue'), meta: { requiresAuth: true },
    },
    {
      path: '/chat/result',  name: 'result',    component: () => import('@/views/chat/ResultView.vue'),  meta: { requiresAuth: true },
    },
    {
      path: '/advice',       name: 'advice',    component: () => import('@/views/advice/AdviceView.vue'),   meta: { requiresAuth: true },
    },
    {
      path: '/report',       name: 'report',    component: () => import('@/views/report/ReportView.vue'),   meta: { requiresAuth: true },
    },
    {
      path: '/exchange',          name: 'exchange',       component: () => import('@/views/exchange/ExchangeView.vue'), meta: { requiresAuth: true },
    },
    {
      path: '/exchange/write',    name: 'exchange-write', component: () => import('@/views/exchange/WriteView.vue'),    meta: { requiresAuth: true },
    },
    {
      path: '/exchange/view/:id', name: 'exchange-view',  component: () => import('@/views/exchange/DetailView.vue'),   meta: { requiresAuth: true },
    },
    {
      path: '/exchange/join',     name: 'exchange-join',  component: () => import('@/views/exchange/JoinView.vue'),
    },
    {
      path: '/exchange/room',     name: 'room',           component: () => import('@/views/exchange/RoomView.vue'),     meta: { requiresAuth: true },
    },
    {
      path: '/my',           name: 'my',        component: () => import('@/views/my/MyView.vue'),     meta: { requiresAuth: true },
    },
    {
      path: '/my/profile',   redirect: '/my',
    },
    {
      path: '/my/databack',  name: 'databack', component: () => import('@/views/my/DataBack.vue'),   meta: { requiresAuth: true },
    },
    {
      path: '/my/chat-view', name: 'chat-view', component: () => import('@/views/my/ChatViewView.vue'), meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  const notificationTarget = typeof to.query.notificationTarget === 'string'
    ? to.query.notificationTarget
    : null
  // /exchange/join 의 파라미터는 OAuth 코드와 무관
  const isExchangeJoin = to.path === '/exchange/join'
  const oauthCode = isExchangeJoin ? null : (to.query.code ?? null)

  // OAuth 코드가 있으면 init()을 await 없이 시작하고 SplashView(/)로 바로 이동
  // SplashView의 watch가 loading 완료를 기다려 /main으로 이동함
  if (oauthCode) {
    if (to.query.pendingJoin)   sessionStorage.setItem('pendingJoin',   to.query.pendingJoin)
    if (to.query.pendingInvite) sessionStorage.setItem('pendingInvite', to.query.pendingInvite)
    auth.init()
    return { path: '/', query: {} }
  }

  if (auth.loading) {
    try {
      await auth.init()
    } catch (error) {
      console.error('[router:auth:init]', error)
    }
  }

  // OAuth 콜백 파라미터를 sessionStorage에 저장
  if (to.query.pendingJoin)   sessionStorage.setItem('pendingJoin',   to.query.pendingJoin)
  if (to.query.pendingInvite) sessionStorage.setItem('pendingInvite', to.query.pendingInvite)

  // 알림 클릭으로 앱이 루트에서 재실행된 경우 실제 목적지로 복구
  if (notificationTarget) {
    return notificationTarget
  }

  const joinPaths = ['/join/1', '/join/2', '/join/3', '/join/4']

  // 비로그인 → 보호 라우트 접근 차단
  if (to.meta.requiresAuth && !auth.user) {
    if (to.query.invite) {
      // invite 코드를 URL에 실어서 브라우저 전환(카톡→Safari)에서도 살아남게 함
      return { path: '/login', query: { pendingInvite: to.query.invite } }
    }
    return '/login'
  }

  // 로그인 상태
  if (auth.user) {
    const isNew = auth.isNewUser()

    // 신규 유저 → join 플로우로
    if (isNew && !joinPaths.includes(to.path)) {
      return '/join/1'
    }

    // 기존 유저 → 로그인/스플래시 접근 시 pending 확인 후 리다이렉트
    if (!isNew && (to.path === '/' || to.path === '/login' || joinPaths.includes(to.path))) {
      const pendingId     = sessionStorage.getItem('pendingJoin')
      const pendingInvite = sessionStorage.getItem('pendingInvite')
      if (pendingId) {
        sessionStorage.removeItem('pendingJoin')
        return `/exchange/join?token=${pendingId}`
      }
      if (pendingInvite) {
        sessionStorage.removeItem('pendingInvite')
        return `/exchange?invite=${pendingInvite}`
      }
      return '/main'
    }
  }
})

export default router
