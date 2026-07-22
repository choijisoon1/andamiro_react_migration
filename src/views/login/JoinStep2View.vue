<script setup>
import { useJoinStore } from '@/stores/join'
import { useRouter } from 'vue-router'
import FooterCtp from '@/components/layout/FooterCtp.vue'
import ProfileForm from '@/views/my/ProfileForm.vue'

const join   = useJoinStore()
const router = useRouter()

function next() {
  if (!join.ageGroup) return
  router.push('/join/3')
}
</script>

<template>
  <div class="wrap">
    <div id="bodyWrap" class="login">
      <main>
        <section class="importance-content">
          <div class="text-content">
            <div class="text-group">
              <em>연령대를<br />알려주세요</em>
              <span>맞춤 감정 분석을 위해 필요해요</span>
            </div>
          </div>
          <ProfileForm
            v-model:age-group="join.ageGroup"
            :fields="['ageGroup']"
            id-prefix="join"
          />
        </section>
      </main>
      <FooterCtp label="다음" :disabled="!join.ageGroup" @click="next" />
    </div>
  </div>
</template>
