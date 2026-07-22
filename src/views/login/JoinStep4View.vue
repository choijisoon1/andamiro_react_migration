<script setup>
import { ref } from 'vue'
import { useJoinStore } from '@/stores/join'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import FooterCtp from '@/components/layout/FooterCtp.vue'

const join    = useJoinStore()
const auth    = useAuthStore()
const router  = useRouter()
const loading = ref(false)
const error   = ref('')

async function complete() {
  loading.value = true
  error.value   = ''
  try {
    await join.saveProfile()
    await auth.fetchProfile()
    join.reset()
    const pendingId     = sessionStorage.getItem('pendingJoin')
    const pendingInvite = sessionStorage.getItem('pendingInvite')
    if (pendingId) {
      sessionStorage.removeItem('pendingJoin')
      router.push(`/exchange/join?token=${pendingId}`)
    } else if (pendingInvite) {
      sessionStorage.removeItem('pendingInvite')
      router.push(`/exchange?invite=${pendingInvite}`)
    } else {
      router.push('/main')
    }
  } catch {
    error.value = '저장에 실패했습니다. 다시 시도해주세요.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="wrap">
    <div id="bodyWrap" class="login">
      <main>
        <section class="importance-content">
          <div class="text-content img-end">
            <div class="text-group">
              <em><strong>{{ join.nickname }}</strong>님,<br />환영합니다!</em>
              <span>이제 감정을 기록할 준비가 됐어요</span>
            </div>
          </div>
        </section>
      </main>
      <FooterCtp :label="loading ? '저장 중...' : '시작하기'" :disabled="loading" @click="complete">
        <template #above>
          <p v-if="error" class="join-error">{{ error }}</p>
        </template>
      </FooterCtp>
    </div>
  </div>
</template>

<style scoped lang="scss">
#bodyWrap.login {
  main {
    .text-group {
      em strong {
        color: $primary;
        font-style: normal;
      }
    }
  }

  .join-error {
    font-size: $font13;
    color: #ff6b6b;
    text-align: center;
    margin-bottom: 8px;
  }
}
</style>
