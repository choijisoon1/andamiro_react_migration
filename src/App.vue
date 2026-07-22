<script setup>
import { ref, provide, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ModalBottom from '@/components/layout/modalBottom.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router    = useRouter()
const route     = useRoute()
const appReady  = computed(() => !authStore.loading)

// 타임아웃으로 /login에 머물던 중 auth가 뒤늦게 복구되면 자동 이동
// router.isReady()로 초기 네비게이션 완료 후 route.path를 읽어야
// "앱 로드 중 초대링크 진입 시 route.path === '/'" 오탐을 막는다
watch(() => authStore.user, async (user, prev) => {
  if (!user || prev) return  // 로그아웃이거나 이미 로그인 상태면 무시
  await router.isReady()
  const stuck = route.path === '/login' || route.path === '/'
  if (!stuck) return
  const pendingId     = sessionStorage.getItem('pendingJoin')
  const pendingInvite = sessionStorage.getItem('pendingInvite')
  if (pendingId) {
    sessionStorage.removeItem('pendingJoin')
    router.replace(`/exchange/join?token=${pendingId}`)
  } else if (pendingInvite) {
    sessionStorage.removeItem('pendingInvite')
    router.replace(`/exchange?invite=${pendingInvite}`)
  } else if (authStore.isNewUser()) {
    router.replace('/join/1')
  } else {
    router.replace('/main')
  }
})

// ── 모달 ──────────────────────────────────────────────────────
const modalShow    = ref(false)
const modalOptions = ref({})

function openModal(options = {}) { modalOptions.value = options; modalShow.value = true }
function closeModal()  { modalShow.value = false; modalOptions.value.onClose?.() }
function confirmModal(){ modalShow.value = false; modalOptions.value.onConfirm?.() }

provide('openModal',  openModal)
provide('closeModal', closeModal)

// ── 인앱 토스트 (서비스워커 푸시 메시지) ──────────────────────
const toast     = ref(null)   // { title, body, url }
let toastTimer  = null

function showToast(data) {
  toast.value = data
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 5000)
}
function dismissToast() { toast.value = null; clearTimeout(toastTimer) }
function goToast() {
  if (toast.value?.url) router.push(toast.value.url)
  dismissToast()
}

function onSwMessage(e) {
  if (e.data?.type === 'PUSH') showToast(e.data)
}

async function clearBadge() {
  if ('clearAppBadge' in navigator) {
    try { await navigator.clearAppBadge() } catch { /* ignore */ }
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') clearBadge()
}

onMounted(() => {
  clearBadge()
  window.addEventListener('focus', clearBadge)
  document.addEventListener('visibilitychange', onVisibilityChange)
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.addEventListener('message', onSwMessage)
})
onBeforeUnmount(() => {
  window.removeEventListener('focus', clearBadge)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.removeEventListener('message', onSwMessage)
})
</script>

<template>
  <div v-if="!appReady" class="app-loading">
    <div class="app-loading__inner">
      <img src="/assets/img/main/img-splash.gif" alt="안다미로" />
    </div>
  </div>
  <template v-else>
    <RouterView />
    <ModalBottom
      :show="modalShow"
      :icon="modalOptions.icon"
      :title="modalOptions.title"
      :description="modalOptions.description"
      :cancel-label="modalOptions.cancelLabel"
      :btn-label="modalOptions.btnLabel"
      @close="closeModal"
      @confirm="confirmModal"
    />

    <!-- 인앱 푸시 토스트 -->
    <Transition name="toast">
      <div v-if="toast" class="app-toast" role="alert" @click="goToast">
        <div class="app-toast__icon">🔔</div>
        <div class="app-toast__body">
          <p class="app-toast__title">{{ toast.title }}</p>
          <p class="app-toast__desc">{{ toast.body }}</p>
        </div>
        <button class="app-toast__close" @click.stop="dismissToast">✕</button>
      </div>
    </Transition>
  </template>
</template>

<style>
.app-loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.app-loading__inner img { width: 200px; height: auto; }

/* 인앱 토스트 */
.app-toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 400px;
  background: #1e293b;
  color: #fff;
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 9999;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}
.app-toast__icon { font-size: 20px; flex-shrink: 0; }
.app-toast__body { flex: 1; min-width: 0; }
.app-toast__title { font-size: 13px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.app-toast__desc  { font-size: 12px; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.app-toast__close { background: none; border: none; color: rgba(255,255,255,0.6); font-size: 14px; cursor: pointer; flex-shrink: 0; padding: 4px; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-12px); }
</style>
