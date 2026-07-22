<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth  = useAuthStore()
const route = useRoute()
const error      = ref('')
const isWebView  = ref(false)
const isIOS      = ref(false)
const canInstall = ref(false)
const showIOSHint = ref(false)
let deferredPrompt = null

onMounted(() => {
  const ua = navigator.userAgent
  isWebView.value =
    /KAKAOTALK|NAVER|Instagram|FB_IAB|FBAN/i.test(ua) ||
    (/Android/.test(ua) && /; wv\)/.test(ua))
  isIOS.value = /iPhone|iPad/i.test(ua) && /WebKit/i.test(ua) && !/CriOS|FxiOS/i.test(ua)

  window.addEventListener('beforeinstallprompt', onPrompt)
})
onBeforeUnmount(() => window.removeEventListener('beforeinstallprompt', onPrompt))

function onPrompt(e) {
  e.preventDefault()
  deferredPrompt = e
  canInstall.value = true
}

async function handleGoogle() {
  const pendingInvite = route.query.pendingInvite || sessionStorage.getItem('pendingInvite') || null
  try { await auth.signInWithGoogle(null, pendingInvite) }
  catch { error.value = '구글 로그인에 실패했습니다.' }
}

async function installApp() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  await deferredPrompt.userChoice
  deferredPrompt = null
  canInstall.value = false
}
</script>

<template>
  <div class="wrap">
    <div id="bodyWrap" class="login">
      <!--<video class="login-animation" autoplay muted loop playsinline preload="auto"
        poster="/assets/img/login/movie.png" aria-hidden="true">
        <source src="/assets/img/login/movie.mp4" type="video/mp4" />
      </video>-->
      <main>
        <section class="importance-content">
          <div class="text-content">
            <div class="text-group">
              <em>하루의 시작과 마무리를<br />함께 만들어요!</em>
              <span>대화하며 쉽게 기록하고 함께 기록된<br />AI 인사이트를 확인해 보세요</span>
            </div>
          </div>
          <div class="img-content">
            <p></p>
          </div>
        </section>
      </main>

      <footer class="button-ctp">
        <div class="button-content">
          <!-- 인앱 브라우저 경고 -->
          <div v-if="isWebView" class="login-webview-warn">
            <p class="login-webview-warn__title">⚠️ 구글 로그인이 지원되지 않아요</p>
            <p class="login-webview-warn__desc">
              카카오톡·네이버 등 앱 내 브라우저에서는 구글 로그인을 할 수 없어요.<br>
              하단 메뉴의 <strong>다른 브라우저로 열기</strong>를 눌러주세요.
            </p>
          </div>

          <p v-if="error" class="login-error">{{ error }}</p>
          <button id="loginGoogleBtn" class="btn-line ico-google" :disabled="isWebView" @click="handleGoogle">
            Google 로그인
          </button>

          <!-- 안드로이드 앱 설치 -->
          <button v-if="canInstall" class="btn-install" @click="installApp">
            📲 홈 화면에 앱 추가하기
          </button>

          <!-- iOS 설치 안내 -->
          <button v-else-if="isIOS" class="btn-install btn-install--ios" @click="showIOSHint = !showIOSHint">
            📲 홈 화면에 앱 추가하기
          </button>
          <div v-if="showIOSHint" class="login-ios-hint">
            <p>① 하단 공유 버튼 <strong>[ ]↑</strong> 탭</p>
            <p>② <strong>홈 화면에 추가</strong> 선택</p>
            <p>③ 설치 후 앱 아이콘으로 열면 알림도 받을 수 있어요 🔔</p>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
#bodyWrap.login .img-content {
    flex:1;
    display:flex;
    justify-content:center;
    align-items: center;

    p {
      content:"";
      margin:0 auto;
      display:block;
      width:280px;
      height:280px;
      background: url("/assets/img/main/img-splash.gif") no-repeat center /100%;

    }
}


.login-webview-warn {
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 12px;
  text-align: left;

  &__title { font-size: 13px; font-weight: 600; color: #e65100; margin-bottom: 6px; }
  &__desc   { font-size: 12px; color: #5d4037; line-height: 1.6; }
}

.btn-install {
  width: 100%;
  height: 48px;
  margin-top: 10px;
  border: 1.5px solid var(--primary);
  border-radius: 12px;
  background: rgba(66,131,243,0.07);
  color: var(--primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &--ios { border-color: #555; color: #333; background: rgba(0,0,0,0.04); }
}

.login-ios-hint {
  background: #f5f5f5;
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 8px;
  text-align: left;

  p { font-size: 13px; color: #444; line-height: 2; }
}

.login-error {
  font-size: 13px;
  color: #dc2626;
  margin-bottom: 8px;
  text-align: center;
}
</style>
