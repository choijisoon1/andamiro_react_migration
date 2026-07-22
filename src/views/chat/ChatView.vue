<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import ModalBottom from '@/components/layout/modalBottom.vue'
import ModalButton from '@/components/common/ModalButton.vue'
import ChatComposer from '@/components/layout/ChatComposer.vue'
import EmotionCameraPopup from '@/components/common/EmotionCameraPopup.vue'
import { useChatStore } from '@/stores/chat'
import { useChatAgent } from '@/composables/useChatAgent'
import { useChatN8n } from '@/composables/useChatN8n'

// ── 상수 ──────────────────────────────────────────────────────
const GREETING_LINE2 = {
  best:   '오늘의 하루가 정말 최고였어요!',
  good:   '오늘의 하루가 좋으셨군요!',
  normal: '오늘의 하루는 어떠셨나요?',
  bad:    '오늘의 하루가 좀 힘드셨군요.',
  worst:  '오늘의 하루가 너무 힘드셨군요.',
}
const STARTER_CHIPS = {
  best:   ['에너지가 넘쳐요', '기분이 아주 좋아요', '활기차고 자신 있어요', '오늘 잘될 것 같아요'],
  good:   ['기분이 괜찮아요', '안정적이고 편안해요', '차분하고 좋아요', '마음이 가벼워요'],
  normal: ['무난해요', '그냥 그래요', '차분해요', '특별한 건 없어요'],
  bad:    ['의욕이 없어요', '피곤하고 처져요', '마음이 무거워요', '집중이 잘 안 돼요'],
  worst:  ['너무 지쳤어요', '불안하고 초조해요', '머리가 복잡해요', '버겁고 힘들어요'],
}
const IMAGE_MAX_DIM = 640
const IMAGE_QUALITY = 0.70
const VOICE_AUTO_SEND_MS = 2000

// ── 의존성 ─────────────────────────────────────────────────────
const chat              = useChatStore()
const router            = useRouter()
const { send }          = useChatAgent()
const { send: sendN8n, isEnabled: useN8n } = useChatN8n()

// ── 상태 ──────────────────────────────────────────────────────
const inputText    = ref('')
const chatThread   = ref(null)
const composerRef  = ref(null)
const showIntro    = ref(chat.messages.length === 0)
const isThinking   = ref(false)
const pendingImage = ref(null)   // { base64, mediaType, dataUrl }
const isVoiceOn    = ref(false)
const showAttachModal = ref(false)
const showEmotionCamera = ref(false)
const showUnsavedBackModal = ref(false)
const aiChips      = ref([])     // n8n이 반환한 동적 팔로우업 칩

let recognition       = null
let voiceFinalAccum   = ''
let voiceAutoSendTimer = null
let cameraCaptures = []

// ── 계산값 ─────────────────────────────────────────────────────
const greetingLine2 = computed(() => GREETING_LINE2[chat.emotion] ?? GREETING_LINE2.good)
const starterChips  = computed(() => STARTER_CHIPS[chat.emotion] ?? STARTER_CHIPS.good)
const canSend       = computed(() => inputText.value.trim().length > 0 && !isThinking.value)
const hasUnsavedChat = computed(() => chat.messages.length > 0 || !!chat.emotion)

// ── 날짜 / 시간 ────────────────────────────────────────────────
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']
function formatTime(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  const h = d.getHours()
  const m = d.getMinutes()
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(m).padStart(2, '0')}`
}
function formatDateSep(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${DAY_KO[d.getDay()]}요일`
}
function showDateSep(i) {
  if (i === 0) return true
  const prev = chat.messages[i - 1]
  const curr = chat.messages[i]
  if (!prev?.time || !curr?.time) return false
  const a = prev.time instanceof Date ? prev.time : new Date(prev.time)
  const b = curr.time instanceof Date ? curr.time : new Date(curr.time)
  return a.toDateString() !== b.toDateString()
}

// ── 스크롤 / 리사이즈 ──────────────────────────────────────────
function autoResize() {
  composerRef.value?.autoResize()
}
function scrollToBottom() {
  nextTick(() => {
    if (chatThread.value) chatThread.value.scrollTop = chatThread.value.scrollHeight
  })
}

// ── AI 호출 ────────────────────────────────────────────────────
async function callAI() {
  isThinking.value = true
  scrollToBottom()
  const img = pendingImage.value
  pendingImage.value = null
  try {
    let replyText
    if (useN8n) {
      const { reply, chips } = await sendN8n(chat.emotion, chat.messages, img)
      replyText = reply
      aiChips.value = chips
    } else {
      replyText = await send(chat.emotion, chat.messages, img)
      aiChips.value = []
    }
    chat.addMessage('assistant', replyText)
  } catch (err) {
    const s = err.status
    const msg =
      s === 401 ? 'API 키 인증에 실패했어요. 관리자에게 문의해 주세요.' :
      s === 429 ? '요청이 많아 잠시 막혔어요. 잠시 후 다시 시도해 주세요.' :
      s === 529 ? 'AI 서버가 바빠요. 잠시 후 다시 시도해 주세요.' :
      '죄송해요, 잠시 문제가 생겼어요. 다시 말씀해 주세요 🙏'
    chat.addMessage('assistant', msg)
    aiChips.value = []
  } finally {
    isThinking.value = false
    scrollToBottom()
  }
}

async function handleUserMessage(text) {
  if (isThinking.value) return
  chat.addMessage('user', text)
  showIntro.value = false
  scrollToBottom()
  await callAI()
}

// ── 텍스트 전송 ────────────────────────────────────────────────
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isThinking.value) return
  inputText.value = ''
  await nextTick()
  autoResize()
  handleUserMessage(text)
}
function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
    e.preventDefault()
    sendMessage()
  }
}

// ── 칩 / 완료 ──────────────────────────────────────────────────
function handleChipClick(label) { handleUserMessage(label) }
function finishDiary() {
  if (isThinking.value) return
  chat.content = chat.messages.filter(m => m.role === 'user' && m.text).map(m => m.text).join('\n')
  router.push('/chat/result')
}

function handleBackClick() {
  if (hasUnsavedChat.value) {
    showUnsavedBackModal.value = true
    return
  }
  router.push('/main')
}
function closeUnsavedBackModal() { showUnsavedBackModal.value = false }
function confirmUnsavedBack() {
  showUnsavedBackModal.value = false
  router.push('/main')
}

// ── 이미지 첨부 ────────────────────────────────────────────────
function attachImage() { showAttachModal.value = true }
function pickFromGallery() { showAttachModal.value = false; composerRef.value?.openFilePicker() }
function pickFromCamera() {
  showAttachModal.value = false
  showEmotionCamera.value = true
}
function handleCameraComplete(result) {
  showEmotionCamera.value = false
  const capturedImage = result.capturedImageDataUrl || result.capturedImageUrl

  if (capturedImage) {
    if (result.capturedImageUrl?.startsWith('blob:')) {
      cameraCaptures.push({
        url: result.capturedImageUrl,
        meta: result.capturedImageMeta,
      })
    }

    chat.addMessage('user', '', capturedImage)
    showIntro.value = false
    scrollToBottom()
  }
  const percent = Math.round(result.score * 100)
  handleUserMessage(`표정 분석 결과는 ${result.emotionLabel} ${percent}%예요.`)
}

function downscaleImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const out = canvas.toDataURL('image/jpeg', IMAGE_QUALITY)
      resolve({ dataUrl: out, base64: out.split(',')[1], mediaType: 'image/jpeg' })
    }
    img.onerror = () => {
      const b64 = dataUrl.split(',')[1] ?? ''
      resolve({ dataUrl, base64: b64, mediaType: 'image/jpeg' })
    }
    img.src = dataUrl
  })
}

async function handleImageFile(e) {
  const file = e.target?.files?.[0]
  if (!file) return
  e.target.value = ''

  const reader = new FileReader()
  reader.onload = async (ev) => {
    const raw = ev.target?.result
    if (!raw) return
    const result = await downscaleImage(raw)
    pendingImage.value = result
    chat.addMessage('user', '', result.dataUrl)
    showIntro.value = false
    scrollToBottom()
    await callAI()
  }
  reader.readAsDataURL(file)
}

// ── 음성 인식 ──────────────────────────────────────────────────
function clearVoiceTimer() {
  if (voiceAutoSendTimer) { clearTimeout(voiceAutoSendTimer); voiceAutoSendTimer = null }
}
function scheduleVoiceAutoSend() {
  clearVoiceTimer()
  voiceAutoSendTimer = setTimeout(() => {
    const text = voiceFinalAccum.trim()
    if (!text) return
    voiceFinalAccum = ''
    inputText.value = ''
    autoResize()
    handleUserMessage(text)
  }, VOICE_AUTO_SEND_MS)
}
function stopVoice() {
  isVoiceOn.value = false
  voiceFinalAccum = ''
  clearVoiceTimer()
  try { recognition?.stop() } catch { /* ignore */ }
  recognition = null
}
function toggleVoice() {
  if (isThinking.value) return
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('음성 입력은 Chrome·Edge 등에서 지원됩니다.')
    return
  }
  if (isVoiceOn.value) { stopVoice(); return }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SR()
  recognition.lang = 'ko-KR'
  recognition.continuous = true
  recognition.interimResults = true

  recognition.onstart  = () => { isVoiceOn.value = true; voiceFinalAccum = '' }
  recognition.onresult = (ev) => {
    let interim = ''
    let gotFinal = false
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) { voiceFinalAccum += ev.results[i][0].transcript; gotFinal = true }
      else interim += ev.results[i][0].transcript
    }
    inputText.value = (voiceFinalAccum + interim).trim()
    if (gotFinal) scheduleVoiceAutoSend()
  }
  recognition.onend = () => {
    if (!isVoiceOn.value) return
    setTimeout(() => { if (isVoiceOn.value) try { recognition?.start() } catch { /* ignore */ } }, 80)
  }
  recognition.onerror = (ev) => {
    if (ev.error === 'not-allowed') { alert('마이크 권한이 필요해요.'); stopVoice(); return }
    if (ev.error === 'aborted') return
    if (ev.error === 'no-speech' || ev.error === 'network') {
      setTimeout(() => { if (isVoiceOn.value) try { recognition?.start() } catch { /* ignore */ } }, 200)
    }
  }
  try { recognition.start() } catch { stopVoice() }
}

onMounted(scrollToBottom)
onBeforeUnmount(() => {
  stopVoice()
  cameraCaptures.forEach(({ url }) => URL.revokeObjectURL(url))
  cameraCaptures = []
})
</script>

<template>
  <PageLayout title="오늘의 일기" back-to="/main" intercept-back @back="handleBackClick">
    <template #body>
      <main class="chat-thread" ref="chatThread" role="main">
        <div class="chat-messages" role="log" aria-live="polite" aria-relevant="additions">

          <!-- 인사 섹션 -->
          <div v-if="showIntro" class="chat-msg chat-msg--opening">
            <section class="chat-opening__text">
              <h2 class="chat-opening__title">
                안녕하세요!<br />
                <span>{{ greetingLine2 }}</span>
              </h2>
              <p class="chat-opening__sub">선택하신 감정의 세부 감정을 선택해주세요</p>
            </section>
          </div>

          <!-- 대화 메시지 -->
          <template v-for="(msg, i) in chat.messages" :key="i">
            <!-- 날짜 구분선 -->
            <div v-if="showDateSep(i)" class="chat-date-sep">
              <span>{{ formatDateSep(msg.time) }}</span>
            </div>
            <!-- 이미지 말풍선 -->
            <div v-if="msg.dataUrl" :class="['chat-msg', msg.role === 'user' ? 'chat-msg--user' : 'chat-msg--ai']">
              <template v-if="msg.role === 'user'">
                <div class="chat-msg__body">
                  <div class="chat-msg__img-wrap"><img :src="msg.dataUrl" alt="첨부 이미지" /></div>
                </div>
                <span class="chat-msg__time">{{ formatTime(msg.time) }}</span>
              </template>
              <template v-else>
                <img class="chat-msg__avatar" src="/assets/img/andamiro-favicon-180.png" alt="안다미로" />
                <div class="chat-msg__col">
                  <span class="chat-msg__sender">안다미로</span>
                  <div class="chat-msg__body-row">
                    <div class="chat-msg__body">
                      <div class="chat-msg__img-wrap"><img :src="msg.dataUrl" alt="첨부 이미지" /></div>
                    </div>
                    <span class="chat-msg__time">{{ formatTime(msg.time) }}</span>
                  </div>
                </div>
              </template>
            </div>
            <!-- 텍스트 말풍선 -->
            <div v-else-if="msg.text" :class="['chat-msg', msg.role === 'user' ? 'chat-msg--user' : 'chat-msg--ai']">
              <template v-if="msg.role === 'user'">
                <div class="chat-msg__body">
                  <p class="chat-msg__bubble">{{ msg.text }}</p>
                </div>
                <span class="chat-msg__time">{{ formatTime(msg.time) }}</span>
              </template>
              <template v-else>
                <img class="chat-msg__avatar" src="/assets/img/andamiro-favicon-180.png" alt="안다미로" />
                <div class="chat-msg__col">
                  <span class="chat-msg__sender">안다미로</span>
                  <div class="chat-msg__body-row">
                    <div class="chat-msg__body">
                      <p class="chat-msg__bubble">{{ msg.text }}</p>
                    </div>
                    <span class="chat-msg__time">{{ formatTime(msg.time) }}</span>
                  </div>
                </div>
              </template>
            </div>
          </template>

          <!-- 타이핑 인디케이터 -->
          <div v-if="isThinking" class="chat-msg chat-msg--ai" aria-label="AI 응답 중">
            <img class="chat-msg__avatar" src="/assets/img/andamiro-favicon-180.png" alt="안다미로" />
            <div class="chat-msg__col">
              <span class="chat-msg__sender">안다미로</span>
              <div class="chat-msg__body">
                <div class="chat-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 스타터 칩 (인트로) -->
          <div v-if="showIntro" class="chat-chips-wrap">
            <div class="chat-chips chat-chips--grid">
              <button v-for="chip in starterChips" :key="chip" type="button" class="chat-chip" @click="handleChipClick(chip)">{{ chip }}</button>
              <button type="button" class="chat-chip chat-chip--finish" @click="finishDiary">기록완료</button>
            </div>
          </div>

          <!-- 동적 칩 + 기록완료 (대화 중) -->
          <div v-if="!showIntro && chat.messages.length > 0 && !isThinking" class="chat-chips-wrap">
            <div class="chat-chips">
              <button
                v-for="chip in aiChips"
                :key="chip"
                type="button"
                class="chat-chip"
                @click="handleChipClick(chip)"
              >{{ chip }}</button>
              <button type="button" class="chat-chip chat-chip--finish" @click="finishDiary">기록완료</button>
            </div>
          </div>

        </div>
      </main>
    </template>

    <template #footer>
      <ChatComposer
        ref="composerRef"
        v-model="inputText"
        placeholder="질문을 입력해 보세요"
        :disabled="isThinking"
        :can-send="canSend"
        show-attach
        show-voice
        :is-voice-on="isVoiceOn"
        :voice-auto-send-seconds="VOICE_AUTO_SEND_MS / 1000"
        accept="image/*"
        @send="sendMessage"
        @attach="attachImage"
        @file-change="handleImageFile"
        @toggle-voice="toggleVoice"
        @stop-voice="stopVoice"
        @input="autoResize"
        @keydown="handleKeydown"
      />
    </template>
  </PageLayout>

  <ModalBottom
    :show="showUnsavedBackModal"
    title="조금만 더 쓰면 완성이에요!"
    @close="closeUnsavedBackModal"
  >
    <template #description>
      나가면 작성하던 내용이 저장되지 않아요<br />
      지금의 감정을 조금만 더 기록해 볼까요?
    </template>
    <div class="img-content">
      <p class="img-group ok-diary">
        <img src="/assets/img/emotion/img-none.png" style="height:156px;" alt="" />
      </p>
    </div>
    <template #footer>
      <div class="button-content--duo">
        <button class="btn-ctp--secondary" @click="confirmUnsavedBack">다음에 하기</button>
        <button class="btn-ctp" @click="closeUnsavedBackModal">계속 작성하기</button>
      </div>
    </template>
  </ModalBottom>

  <ModalBottom :show="showAttachModal" title="어떻게 기록할까요?" title-class="title-l" @close="showAttachModal = false">
    <template #footer>
      <div class="button-content">
        <div class="button-group">
          <ModalButton
            title="사진 업로드"
            description="갤러리에서 사진을 선택하세요"
            icon="photo"
            @click="pickFromGallery"
          />
          <ModalButton
            title="실시간 표정 분석"
            description="카메라로 표정을 실시간 분석해요"
            icon="video"
            @click="pickFromCamera"
          />
        </div>
      </div>
    </template>
  </ModalBottom>

  <EmotionCameraPopup
    :show="showEmotionCamera"
    @close="showEmotionCamera = false"
    @complete="handleCameraComplete"
  />
</template>

<style scoped>
.btn-attach {
  width: 100%;
  height: 52px;
  border-radius: 100px;
  font-size: var(--font16);
  font-weight: 600;
  background: var(--primary);
  color: var(--white);
  border: none;
  cursor: pointer;

  &--outline {
    background: transparent;
    color: var(--primary);
    border: 1.5px solid var(--primary);
  }
}
</style>
