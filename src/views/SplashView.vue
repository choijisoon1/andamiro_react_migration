<script setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()

watch(
  () => auth.loading,
  (loading) => {
    if (!loading) router.replace(auth.user ? '/main' : '/login')
  },
  { immediate: true },
)
</script>

<template>
  <div class="wrap splash">
    <main class="splash">
      <div class="splash-content">
        <img src="/assets/img/main/img-splash.gif" alt="안다미로" class="splash-logo" />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.wrap.splash {
  height: 100dvh;
  background: $white;

  main.splash {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background:#fdfdfd;

    .splash-content {
      display: flex;
      align-items: center;
      justify-content: center;

      .splash-logo {
        width: 200px;
        height: auto;
      }
    }
  }
}
</style>
