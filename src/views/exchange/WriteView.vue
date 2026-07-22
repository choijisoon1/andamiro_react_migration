<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import FooterCtp from '@/components/layout/FooterCtp.vue'
import FormGroup from '@/components/common/FormGroup.vue'
import { useExchangeStore } from '@/stores/exchange'
import { supabase } from '@/lib/supabase'

const route    = useRoute()
const router   = useRouter()
const exchange = useExchangeStore()

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif']

const imageFile    = ref(null)
const imagePreview = ref('')
const title        = ref('')
const content      = ref('')
const password      = ref('')
const showPassword  = ref(false)
const saving        = ref(false)
const polishing     = ref(false)
const imageError    = ref('')
const titleError    = ref('')
const contentError  = ref('')
const passwordError = ref('')
const saveError     = ref('')
const clientRequestId = ref(crypto.randomUUID())
const isAiDiary = computed(() => route.query.source === 'ai')

async function polishContent(summary) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) { content.value = summary; return }

  polishing.value = true
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: '사용자의 채팅 요약을 받아 마치 본인이 오늘 하루를 직접 쓴 것처럼 1인칭 감성 일기체로 다듬어 주세요. 2~3문장마다 자연스럽게 줄바꿈(\\n)을 넣어 읽기 편하게 작성하세요. 설명이나 부연 없이 일기 본문만 반환하세요.',
        messages: [{ role: 'user', content: summary }],
      }),
    })
    const data = await res.json()
    content.value = data?.content?.[0]?.text?.trim() || summary
  } catch {
    content.value = summary
  } finally {
    polishing.value = false
  }
}

onMounted(() => {
  const summary = history.state?.summary ?? ''
  if (summary) polishContent(summary)
})


function compressImage(file, maxPx = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round(height * maxPx / width); width = maxPx }
        else                { width  = Math.round(width  * maxPx / height); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

async function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (!ALLOWED_TYPES.includes(file.type)) {
    imageError.value = 'jpg, png, gif 파일만 등록할 수 있어요.'
    e.target.value = ''
    return
  }
  imageError.value = ''
  imagePreview.value = URL.createObjectURL(file)
  // GIF는 압축 생략 (애니메이션 보존)
  imageFile.value = file.type === 'image/gif' ? file : await compressImage(file)
}

function removeImage() {
  imageFile.value    = null
  imagePreview.value = ''
}

async function onSave() {
  titleError.value = ''
  contentError.value = ''
  passwordError.value = ''
  saveError.value = ''

  if (!title.value.trim())    { titleError.value    = '제목을 입력해 주세요.';    return }
  if (!content.value.trim())  { contentError.value  = '내용을 입력해 주세요.';    return }
  if (!password.value.trim()) { passwordError.value = '비밀번호를 입력해 주세요.'; return }

  saving.value = true
  try {
    const result = await exchange.save({
      title:     title.value.trim(),
      content:   content.value.trim(),
      imageFile: imageFile.value,
      password:  password.value.trim() || null,
      clientRequestId: clientRequestId.value,
    })
    if (result?.id) {
      const shareUrl = `${window.location.origin}/exchange/join?token=${result.invitation_token}`
      router.replace({
        name: 'exchange-view',
        params: { id: result.id },
        state: { justCreated: true, shareUrl },
      })
    } else {
      router.replace('/exchange')
    }
  } catch (e) {
    saveError.value = e?.message || '저장에 실패했어요.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageLayout title="공유일기 만들기" back-to="/exchange">
    <template #body>
      <main class="write-body">
        <section v-if="isAiDiary" class="badge-content">
            <p class="badge-info">✦ AI가 오늘의 일기를 작성했어요</p>
        </section>
        <section class="form-content">
          <!-- 이미지 -->
          <FormGroup label="이미지" :error="imageError">
            <div v-if="imagePreview" class="write-img-preview">
              <img :src="imagePreview" alt="미리보기" />
              <button type="button" class="write-img-remove" @click="removeImage">✕</button>
            </div>
            <label v-else class="write-img-add">
              <input type="file" accept=".jpg,.jpeg,.png,.gif" class="write-file-input" @change="onFileChange" />
              <span class="write-img-add__icon">+</span>
            </label>
          </FormGroup>
          <!-- 제목 -->
          <FormGroup label="제목" for="write-title" :error="titleError">
            <input id="write-title" v-model="title" class="write-input" type="text" placeholder="제목을 입력해 주세요" maxlength="60" autocomplete="off" />
          </FormGroup>

          <!-- 채팅 요약 -->
          <FormGroup label="내용" for="write-content" :error="contentError">
            <div v-if="polishing" class="write-skeleton" />
            <textarea v-else id="write-content" v-model="content" class="write-textarea" placeholder="오늘의 채팅 내용을 요약해 주세요" rows="6" />
          </FormGroup>

          <!-- 비밀번호 -->
          <FormGroup label="비밀번호" for="write-password" hint="초대받은 상대방에게 비밀번호를 알려주세요" :error="passwordError">
            <div class="write-pw-wrap">
              <input id="write-password" v-model="password" class="write-input" :type="showPassword ? 'text' : 'password'" placeholder="비밀번호를 입력해 주세요" maxlength="20" autocomplete="new-password" />
              <button type="button" class="write-pw-eye" @click="showPassword = !showPassword">
                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </FormGroup>
          <p v-if="saveError" class="write-error" role="alert">{{ saveError }}</p>

        </section>
      </main>

      <FooterCtp :label="saving ? '저장 중…' : '완료'" :disabled="saving" @click="onSave" />
    </template>
  </PageLayout>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

.write-body{
  margin-bottom:20px;

  .badge-content {
  display:block;
  padding:20px  24px;

  .badge-info {
    display:inline-block;
    background:#ECF1FE;
    color:#4A75F7;
    width:auto;
    padding:4px 12px;
    border-radius:20px;
    font-size:$font12;
    font-weight:$font-m;
  }


  }

  .form-content {
    gap:24px;
  }
}


.write-pw-wrap {
  position: relative;
  display: flex;
  align-items: center;

  .write-input { flex: 1; padding-right: 44px; }

}

.write-pw-eye {
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


// 이미지 업로드
.write-img-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100px;
  height: 100px;
  border: 1.5px dashed $border;
  border-radius: 12px;
  cursor: pointer;
  background: $color-fa;

  &__icon {
    font-size: 24px;
    color: $text-disabled;
    line-height: 1;
    text-align:center;

    &::before { content:""; display:block; width:20px; height:20px; background:url("/assets/img/com/ico-folder.svg") no-repeat center / 100%; }
  }

  &__text {
    font-size: $font12;
    color: $text-disabled;
    text-align: center;
    line-height: 1.4;

    small { font-size: 10px; }
  }
}

.write-file-input { display: none; }

.write-img-preview {
  position: relative;
  width: 100px;
  height: 100px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
  }
}

.write-img-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: $title;
  color: $white;
  font-size: 11px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}


.write-share-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  .btn-ctp { width: 100%; }
}

.write-share-url {
  width: 100%;
  background: #F4F6FA;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: $font12;
  color: $text-sub;
  word-break: break-all;
  text-align: center;
}

.write-error {
  font-size: $font14;
  color: #dc2626;
  padding: 4px 2px;
}


@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

</style>
