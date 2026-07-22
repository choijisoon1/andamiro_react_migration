<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useExchangeStore } from '@/stores/exchange'

const router   = useRouter()
const route    = useRoute()
const auth     = useAuthStore()
const exchange = useExchangeStore()

const inviteToken = route.query.token ?? route.query.id ?? ''
const post     = ref(null)
const code     = ref('')
const showCode = ref(false)
const joining  = ref(false)
const error    = ref('')

const isWebView = computed(() => {
  const ua = navigator.userAgent
  return /KAKAOTALK|NAVER|Instagram|FB_IAB|FBAN/i.test(ua) || (/Android/.test(ua) && /; wv\)/.test(ua))
})

onMounted(async () => {
  if (!inviteToken) { error.value = '유효하지 않은 초대 링크예요.'; return }
  if (!auth.user) return  // 로그인 안내 UI 표시

  const invitation = await exchange.getInvitationPreview(inviteToken)
  if (!invitation?.post) { error.value = '존재하지 않는 초대예요.'; return }
  post.value = invitation.post
})

async function loginWithGoogle() {
  try { await auth.signInWithGoogle(inviteToken) }
  catch { error.value = '로그인에 실패했어요. 다시 시도해 주세요.' }
}

async function join() {
  if (!post.value) return
  joining.value = true
  error.value   = ''
  try {
    const postId = await exchange.acceptInvitation(inviteToken, code.value.trim())
    if (postId === false) { error.value = '비밀번호가 틀렸어요.'; return }
    router.replace(`/exchange/view/${postId}`)
  } catch (e) {
    error.value = e?.message || '입장 중 오류가 발생했어요.'
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <!-- ① 비로그인: 로그인 페이지 구조 재사용 -->
  <div v-if="!auth.user" class="wrap">
    <div id="bodyWrap" class="login">
      <main>
        <section class="importance-content">
          <div class="text-content join-hero-content">
            <img src="/assets/img/main/img-splash.gif" alt="안다미로" class="join-hero__img" />
          </div>
          <div v-if="isWebView" class="join-webview-warn">
            <p class="join-webview-warn__title">⚠️ 구글 로그인이 지원되지 않아요</p>
            <p class="join-webview-warn__desc">하단 메뉴의 <strong>다른 브라우저로 열기</strong>를 눌러 Chrome에서 열어주세요.</p>
          </div>
        </section>
      </main>
      <footer class="button-ctp">
        <div class="button-content">
          <p v-if="error" class="join-error">{{ error }}</p>
          <p class="join-info-btn">공유일기를 보려면 로그인해주세요</p>
          <button class="btn-line ico-google" :disabled="isWebView" @click="loginWithGoogle">
            Google 로 로그인
          </button>
        </div>
      </footer>
    </div>
  </div>

  <!-- ② ~ ④ 나머지 상태 -->
  <div v-else class="join-wrap">

    <!-- ② 로그인 + 게시글 -->
    <template v-if="post">
      <section class="join-pw">
        <span class="join-pw__icon" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </span>
        <div class="text-content">
          <h2 class="join-pw__title">비밀번호를 입력해 주세요</h2>
          <p class="join-pw__desc">
            <em class="join-pw__post-name">"{{ post.title }}"</em>를<br>읽으려면 비밀번호가 필요해요.
          </p>
        </div>

        <div class="join-pw__field">
          <p>
            <span class="join-pw__field-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input
            v-model="code"
            class="join-pw__input"
            :type="showCode ? 'text' : 'password'"
            placeholder="비밀번호"
            maxlength="20"
            @keydown.enter="join"
          />
          </p>
          <button type="button" class="join-pw__eye" @click="showCode = !showCode">
            <svg v-if="showCode" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <p v-if="error" class="join-error">{{ error }}</p>
        <button class="join-btn" :disabled="joining" @click="join">
          {{ joining ? '입장 중…' : '열람하기' }}
        </button>
        <button class="join-back" @click="router.replace('/exchange')">돌아가기</button>
      </section>
    </template>

    <!-- ③ 에러 -->
    <template v-else-if="error">
      <section class="join-pw">
        <p class="join-error">{{ error }}</p>
        <button class="join-btn" @click="router.replace('/exchange')">교환일기로 돌아가기</button>
      </section>
    </template>

    <!-- ④ 로딩 -->
    <template v-else>
      <p class="join-loading">초대 정보를 불러오는 중…</p>
    </template>

  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

/* ── 전체 래퍼 ── */
.join-wrap {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: $white;
}

/* ── ① 비로그인: 로그인 구조 재사용 ── */
.join-hero-content {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.join-hero__img {
  width: 200px !important;
  height: auto;
  margin: 0 auto;
}

.join-hero__brand {
  color: $primary !important;
  font-size: $font24 !important;
  letter-spacing: -0.5px;
}

.join-info-btn {
  width:auto;
  height: 38px;
  background: $primary;
  color: $white;
  border-radius:50px;
  font-size: $font16;
  font-weight: $font-sb;
  margin-bottom:20px;
  padding:0 12px;
  display:inline-flex;
  align-items: center;
  justify-content: center;
}

/* ── (구) join-hero — 더 이상 미사용, 안전하게 제거 ── */
.join-hero {
  &__img {
    width: 200px;
    height: auto;
  }
  &__brand {
    margin-top: 12px;
    font-size: $font24;
    font-weight: $font-b;
    color: $primary;
    letter-spacing: -0.5px;
  }
}

.join-footer {
  padding: 0 24px calc(32px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── ② 비밀번호 입력 ── */
.join-pw {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: $bg-color;
  gap: 12px;

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    border-radius: $radius-lg-20;
    background: rgba(66, 131, 243, 0.10);
    color: #4283F3;
    margin-bottom: 4px;
    flex-shrink: 0;
  }

  &__title {
    font-size: $font20;
    font-weight: $font-b;
    color: $title;
    text-align: center;
  }

  &__desc {
    font-size: $font14;
    color: $text-sub;
    text-align: center;
    line-height: 1.7;
  }

  &__post-name {
    font-style: normal;
    font-weight: $font-sb;
    color: $title;
  }

  &__field {
    position: relative;
    width: 100%;
    max-width: 100%;
    display: flex;
    align-items: center;
    margin-top: 4px;

    p {
      width: 100%;
    }

  }

  &__field-icon {
    position: absolute;
    top:50%;
    transform: translate(0, -50%);
    left: 14px;
    color: $text-disabled;
    display: flex;
    align-items: center;
  }

  &__input {
    width: 100%;
    height: 50px;
    border: 1.5px solid $border;
    border-radius: 12px;
    padding: 0 44px;
    font-size: $font16;
    font-family: inherit;
    background: $white;
    outline: none;
    box-sizing: border-box;

    &:focus { border-color: $primary; }
    &::placeholder { color: $text-disabled; }
  }

  &__eye {
    position: absolute;
    right: 14px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: $text-disabled;
    display: flex;
    align-items: center;

    svg { width: 20px; height: 20px; }
    &:hover { color: $text-sub; }
  }
}

/* ── 공통 버튼 ── */
.join-btn {
  width: 100%;
  max-width: 480px;
  height: 52px;
  background: $primary;
  color: $white;
  border: none;
  border-radius: 14px;
  font-size: $font16;
  font-weight: $font-sb;
  cursor: pointer;

  &:disabled { opacity: 0.45; cursor: default; }

  &--google {
    background: $white;
    color: $title;
    border: 1.5px solid $border;
  }
}

.join-back {
  background: none;
  border: none;
  color: $text-sub;
  font-size: $font16;
  cursor: pointer;
  padding: 4px 0;

  &:hover { color: $title; }
}

.join-loading,
.join-error {
  font-size: $font14;
  color: $text-sub;
  text-align: center;
}

.join-error { color: #dc2626; }

.join-webview-warn {
  width: 100%;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 12px;
  padding: 12px 14px;
  text-align: left;

  &__title { font-size: $font13; font-weight: $font-sb; color: #e65100; margin-bottom: 6px; }
  &__desc   { font-size: $font12; color: #5d4037; line-height: 1.6; }
}
</style>
