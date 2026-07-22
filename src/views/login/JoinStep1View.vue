<script setup>
import { useJoinStore } from '@/stores/join'
import { useRouter } from 'vue-router'
import FooterCtp from '@/components/layout/FooterCtp.vue'
import ProfileForm from '@/views/my/ProfileForm.vue'

const join   = useJoinStore()
const router = useRouter()

function next() {
  if (!join.nickname.trim()) return
  router.push('/join/2')
}
</script>

<template>
  <div class="wrap">
    <div id="bodyWrap" class="login">
      <main>
        <section class="importance-content">
          <div class="text-content">
            <div class="text-group">
              <em>닉네임을<br />입력해 주세요</em>
              <span>안다미로가 부를 이름이에요</span>
            </div>
          </div>
          <ProfileForm
            v-model:nickname="join.nickname"
            :fields="['nickname']"
            id-prefix="join"
            @keyup.enter="next"
          />
        </section>
      </main>

      <FooterCtp label="다음" :disabled="!join.nickname.trim()" @click="next" />
    </div>
  </div>
</template>
