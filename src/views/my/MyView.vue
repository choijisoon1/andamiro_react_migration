<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import ProfileView from '@/views/my/ProfileView.vue'
import { useAuthStore } from '@/stores/auth'
import { useDiaryStore } from '@/stores/diary'
import { useExchangeStore } from '@/stores/exchange'
import { hasVapidPublicKey, usePushSubscription } from '@/composables/usePushSubscription'

const auth      = useAuthStore()
const diary     = useDiaryStore()
const exchange  = useExchangeStore()
const router    = useRouter()
const openModal = inject('openModal')
const { subscribe, unsubscribe } = usePushSubscription()

const nickname  = computed(() => auth.profile?.nickname ?? auth.user?.email?.split('@')[0] ?? '친구')
const email     = computed(() => auth.user?.email ?? '')
const initial   = computed(() => nickname.value.charAt(0).toUpperCase())
const avatarUrl = computed(() => auth.user?.user_metadata?.avatar_url ?? null)

const pushEnabled = ref(false)
const deletingAccount = ref(false)
const showProfileEditor = ref(false)

function openProfileEditor() { showProfileEditor.value = true }
function closeProfileEditor() { showProfileEditor.value = false }

async function checkPushStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
  if (Notification.permission !== 'granted') { pushEnabled.value = false; return }
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    pushEnabled.value = !!sub
  } catch {
    pushEnabled.value = false
  }
}

async function togglePush() {
  if (!auth.user?.id) return
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    openModal({ icon: '🔔', title: '지원하지 않는 환경', description: '이 브라우저는 푸시 알림을 지원하지 않아요.' })
    return
  }
  if (pushEnabled.value) {
    await unsubscribe(auth.user.id)
    pushEnabled.value = false
    openModal({
      icon: '🔔',
      title: '알림이 해제되었어요',
      description: '이제 푸시 알림을 받지 않아요.',
    })
  } else {
    if (!hasVapidPublicKey()) {
      openModal({
        icon: '🔔',
        title: '푸시 설정이 필요해요',
        description: 'VITE_VAPID_PUBLIC_KEY가 설정되지 않았어요. 관리자에게 문의해 주세요.',
      })
      return
    }
    if (Notification.permission === 'denied') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOS = /iPhone|iPad/i.test(navigator.userAgent)
      const desc = isStandalone
        ? isIOS
          ? 'iOS 설정 앱 → 안다미로 → 알림 → 허용으로 바꾼 뒤 앱을 다시 열어주세요.'
          : '홈 화면 앱 아이콘을 길게 누르기 → 앱 정보 → 권한 → 알림 → 허용으로 바꾼 뒤 앱을 다시 열어주세요.'
        : '주소창 옆 🔒 아이콘 → 사이트 설정 → 알림 → 허용으로 바꾼 뒤 다시 시도해 주세요.'
      openModal({ icon: '🔔', title: '알림이 차단되어 있어요', description: desc })
      return
    }
    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
    if (permission !== 'granted') {
      openModal({
        icon: '🔔',
        title: '알림 권한이 필요해요',
        description: '푸시 알림을 받으려면 알림 권한을 허용해 주세요.',
      })
      return
    }
    pushEnabled.value = true
    try {
      await subscribe(auth.user.id)
      openModal({
        icon: '🔔',
        title: '알림이 허용되었어요',
        description: '새 알림이 오면 알려드릴게요.',
      })
    } catch (e) {
      pushEnabled.value = false
      openModal({ icon: '🔔', title: '알림 설정 실패', description: e?.message || '알림 설정에 실패했어요.' })
    }
  }
}

async function handleSignOut() {
  await auth.signOut()
  router.push('/login')
}

function handleDeleteAccountClick() {
  if (!openModal || deletingAccount.value) return

  openModal({
    title: '회원탈퇴 시 모든 기록이 삭제됩니다',
    description: '삭제된 기록은 복구할 수 없어요. 정말 탈퇴할까요?',
    btnLabel: '탈퇴하기',
    onConfirm: handleDeleteAccount,
  })
}

async function handleDeleteAccount() {
  if (deletingAccount.value) return

  deletingAccount.value = true
  try {
    await auth.deleteAccount()
    await router.replace('/login')
  } catch (error) {
    console.error('[account:delete]', error)
    openModal({
      icon: '⚠️',
      title: '회원탈퇴에 실패했어요',
      description: error?.message || '잠시 후 다시 시도해 주세요.',
      btnLabel: '확인',
    })
  } finally {
    deletingAccount.value = false
  }
}

const menuItems = [
  { label: '데이터 백업',          icon: 'backup', to: '/my/databack' },
  /*{ label: '공지사항',             icon: 'notice' },
  { label: '도움말 / FAQ',         icon: 'help'   },
  { label: '약관 및 개인정보 처리방침', icon: 'doc'    },*/
]

onMounted(() => Promise.all([diary.fetchStats(), exchange.fetchMyExchangeCount(), checkPushStatus()]))
</script>


<template>
  <PageLayout v-if="!showProfileEditor" title="마이" class="my" hide-back hide-right>
    <template #body>
      <main class="my-page">
        <div class="my-body">
          <section class="my-hero">
            <div class="text-content">
              <div class="text-group">
                <p class="tit">
                  <span>안녕하세요.</span>
                  <em>안다미로 친구님 🍀</em>
                </p>
              </div>
            </div>
          </section>

          <section class="card-content">
            <!--프로필 편집-->
            <div class="card-item my-profile">
              <div class="my-profile__avatar">
                <img v-if="avatarUrl" :src="avatarUrl" alt="프로필" referrerpolicy="no-referrer" />
                <span v-else>{{ initial }}</span>
              </div>
              <div class="my-profile__info">
                <strong class="my-profile__name">{{ nickname }}</strong>
                <span class="my-profile__email">{{ email }}</span>
              </div>
              <button class="my-profile__edit" @click="openProfileEditor">프로필 편집</button>
            </div>
            <!--나의 기록요약-->
            <div class="label-card">
              <p class="my-section__label">활동요약</p>
              <div class="card-item my-stats">
                <ul>
                    <li>
                      <em>{{ diary.stats.total }}</em>
                      <span>작성한 일기</span>
                    </li>
                    <li >
                      <em>{{ exchange.myExchangeCount }}</em>
                      <span>공유일기</span>
                    </li>
                    <li class="my-stats__item">
                      <em>{{ diary.stats.monthly }}</em>
                      <span>이번 달</span>
                    </li>
                  </ul>
              </div>
            </div>
            <!--설정-->
            <div class="label-card">
              <div class="card-item my-list">
                <RouterLink to="/exchange" class="my-list__item">
                    <span class="my-list__icon my-list__icon--exchange"></span>
                    <span class="my-list__text">공유 일기</span>
                </RouterLink>
                  <button class="my-list__item" @click="togglePush">
                    <span class="my-list__icon my-list__icon--notice"></span>
                    <span class="my-list__text">푸시 알림</span>
                    <span class="my-toggle" :class="{ 'my-toggle--on': pushEnabled }">
                      <span class="my-toggle__thumb" />
                    </span>
                  </button>
              </div>
            </div>

          <!--기타-->
          <div class="label-card">
            <div class="card-item my-list">
              <RouterLink
                  v-for="item in menuItems"
                  :key="item.label"
                  :to="item.to"
                  class="my-list__item"
                >
                <span :class="['my-list__icon', `my-list__icon--${item.icon}`]"></span>
                <span class="my-list__text">{{ item.label }}</span>
                <span class="my-list__arrow"></span>
              </RouterLink>
              <div class="my-list__item my-list__item--version">
                <span class="my-list__icon my-list__icon--doc"></span>
                <span class="my-list__text">앱 버전</span>
                <span class="my-list__version">v0.1.0</span>
              </div>
            </div>
          </div>

          <!--로그아웃, 회원탈퇴-->
          <div class="button-content">
            <button class="text-button" @click="handleSignOut">로그아웃</button>
            <span class="line"></span>
            <button class="text-button" :disabled="deletingAccount" @click="handleDeleteAccountClick">
              {{ deletingAccount ? '탈퇴 처리 중...' : '회원탈퇴' }}
            </button>
          </div>

          </section>
        </div>
      </main>
    </template>
    <template #footer>
      <AppTabBar />
    </template>
  </PageLayout>
  <ProfileView v-else @close="closeProfileEditor" />
</template>

<style scoped lang="scss">
</style>
