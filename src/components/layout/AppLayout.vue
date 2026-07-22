<script setup>
import AppTabBar from './AppTabBar.vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

defineProps({
  title:      { type: String,  default: '' },
  showLogout: { type: Boolean, default: false },
})

const auth   = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="wrap">
    <div id="headerWrap">
      <header id="header" class="header">
        <h1 class="header__logo">안다미로</h1>
        <button v-if="showLogout" class="header__logout" @click="logout">
          로그아웃
        </button>
      </header>
    </div>

    <div id="bodyWrap">
      <main>
        <slot />
      </main>
    </div>

    <AppTabBar />
  </div>
</template>

<style scoped lang="scss">
.wrap {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: calc(#{$header-height} + env(safe-area-inset-top, 0px));
  padding: 0 20px calc(12px);
  padding-top: env(safe-area-inset-top, 0px);
  background: $white;
  border-bottom: 1px solid $border;
}

.header__logo {
  font-size: $font18;
  font-weight: $font-b;
  color: $title;
}

.header__logout {
  font-size: $font13;
  color: $text-disabled;
  padding: 6px 10px;
  border-radius: 8px;
}

#bodyWrap {
  flex: 1 1 auto;
  overflow: hidden;
}

#bodyWrap main {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}
</style>
