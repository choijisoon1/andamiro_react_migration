<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import * as faceapi from 'face-api.js'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'complete'])

const MODEL_URL = '/models'
const MODEL_LOAD_ERROR_MESSAGE = '표정 분석 모델을 불러오지 못했어요. 모델 파일을 확인해 주세요.'
const CAPTURE_MAX_WIDTH = 720
const CAPTURE_MAX_HEIGHT = 960
const CAPTURE_QUALITY = 0.72
const EXPRESSION_LABELS = {
  happy: '행복',
  neutral: '무표정',
  sad: '슬픔',
  surprised: '놀람',
  angry: '분노',
  fearful: '공포',
  disgusted: '혐오',
}
const EXPRESSION_COLORS = {
  happy: '#22C55E',
  neutral: '#9CA3AF',
  sad: '#4B82F5',
  surprised: '#F59E0B',
  fearful: '#A78BFA',
  angry: '#EF4444',
  disgusted: '#6B7280',
}
const EXPRESSION_ORDER = ['happy', 'neutral', 'sad', 'surprised', 'angry', 'fearful', 'disgusted']

const videoRef = ref(null)
const modelsReady = ref(false)
const cameraReady = ref(false)
const isDetecting = ref(false)
const statusText = ref('AI 분석 중')
const cameraError = ref('')
const modelError = ref('')
const expressions = ref(createEmptyExpressions())
const faceBox = ref(null)
const elapsedSeconds = ref(0)

let stream = null
let detectTimer = null
let recordingTimer = null
let isStarting = false
let modelsPromise = null
let hasHistoryEntry = false
let startToken = 0

const expressionItems = computed(() =>
  EXPRESSION_ORDER.map((key) => ({
    key,
    label: EXPRESSION_LABELS[key],
    color: EXPRESSION_COLORS[key] ?? EXPRESSION_COLORS.disgusted,
    value: expressions.value[key] ?? 0,
    percent: Math.round((expressions.value[key] ?? 0) * 100),
  }))
)

const topExpression = computed(() =>
  expressionItems.value.reduce((top, item) => (item.value > top.value ? item : top), expressionItems.value[0])
)

const recordingTimeText = computed(() => {
  const minutes = String(Math.floor(elapsedSeconds.value / 60)).padStart(2, '0')
  const seconds = String(elapsedSeconds.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

watch(
  () => props.show,
  async (show) => {
    if (show) {
      await nextTick()
      bindBackButton()
      await start()
      return
    }
    unbindBackButton()
    stop()
  }
)

async function start() {
  if (isStarting) return
  const token = ++startToken
  isStarting = true

  try {
    resetAnalysis()
    statusText.value = 'AI 분석 중'

    await nextTick()
    await startCamera(token)

    if (token !== startToken) return

    if (cameraReady.value) {
      startRecordingTimer()
      await loadModels()

      if (token !== startToken) return

      startAnalysisLoop()
    }
  } finally {
    if (token === startToken) {
      isStarting = false
    }
  }
}

async function loadModels() {
  modelError.value = ''

  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ])
  }

  try {
    await modelsPromise
    modelsReady.value = true
  } catch (error) {
    console.error('표정 분석 모델 로딩 실패:', error)
    modelsPromise = null
    modelsReady.value = false
    modelError.value = MODEL_LOAD_ERROR_MESSAGE
  }
}

async function startCamera(token) {
  cameraError.value = ''

  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = '이 브라우저에서는 카메라를 사용할 수 없어요.'
    return
  }

  try {
    const nextStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
      },
      audio: false,
    })

    if (token !== startToken) {
      nextStream.getTracks().forEach((track) => track.stop())
      return
    }

    stream = nextStream

    await nextTick()

    if (token !== startToken) return

    if (!videoRef.value) {
      stopStream()
      cameraError.value = '카메라 화면을 준비하지 못했어요.'
      return
    }

    videoRef.value.srcObject = stream

    await videoRef.value.play()

    if (token !== startToken) return

    cameraReady.value = true
  } catch (error) {
    console.error('카메라 실행 실패:', error)
    if (token !== startToken) return

    stopStream()
    cameraReady.value = false

    if (error.name === 'NotAllowedError') {
      cameraError.value = '카메라 권한이 필요합니다.'
    } else if (error.name === 'NotFoundError') {
      cameraError.value = '사용 가능한 카메라를 찾을 수 없어요.'
    } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      cameraError.value = '카메라는 HTTPS 환경에서만 사용할 수 있어요.'
    } else {
      cameraError.value = '카메라를 실행하지 못했어요.'
    }
  }
}

function startAnalysisLoop() {
  if (!cameraReady.value || !modelsReady.value || !videoRef.value) return

  stopAnalysisLoop()
  isDetecting.value = true
  detectTimer = window.setInterval(detectFace, 250)
}

async function detectFace() {
  const video = videoRef.value
  if (!modelsReady.value) return
  if (!video || video.readyState < 2) return

  try {
    const result = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
      .withFaceExpressions()

    if (!result) {
      faceBox.value = null
      statusText.value = 'AI 분석 중'
      return
    }

    expressions.value = normalizeExpressions(result.expressions)
    faceBox.value = getDisplayBox(result.detection.box, video)
    statusText.value = `AI 분석 중 · ${topExpression.value.label}`
  } catch (error) {
    console.error('표정 분석 실패:', error)
  }
}

function getDisplayBox(box, video) {
  const videoWidth = video.videoWidth || 1
  const videoHeight = video.videoHeight || 1
  const elementWidth = video.clientWidth || videoWidth
  const elementHeight = video.clientHeight || videoHeight
  const videoRatio = videoWidth / videoHeight
  const elementRatio = elementWidth / elementHeight

  let scale = elementHeight / videoHeight
  let offsetX = (elementWidth - videoWidth * scale) / 2
  let offsetY = 0

  if (elementRatio > videoRatio) {
    scale = elementWidth / videoWidth
    offsetX = 0
    offsetY = (elementHeight - videoHeight * scale) / 2
  }

  const left = offsetX + (videoWidth - box.x - box.width) * scale

  return {
    left,
    top: offsetY + box.y * scale,
    width: box.width * scale,
    height: box.height * scale,
  }
}

function normalizeExpressions(source) {
  return EXPRESSION_ORDER.reduce((result, key) => {
    result[key] = Number(source?.[key] ?? 0)
    return result
  }, {})
}

function createEmptyExpressions() {
  return EXPRESSION_ORDER.reduce((result, key) => {
    result[key] = 0
    return result
  }, {})
}

function resetAnalysis() {
  modelsReady.value = false
  cameraReady.value = false
  isDetecting.value = false
  cameraError.value = ''
  modelError.value = ''
  expressions.value = createEmptyExpressions()
  faceBox.value = null
  elapsedSeconds.value = 0
}

function restart() {
  stop()
  nextTick(start)
}

async function complete() {
  const top = topExpression.value
  const capture = await captureCompressedFrame()

  emit('complete', {
    emotion: top.key,
    emotionLabel: top.label,
    score: top.value,
    expressions: { ...expressions.value },
    capturedImageUrl: capture?.url ?? capture?.dataUrl ?? '',
    capturedImageDataUrl: capture?.dataUrl ?? capture?.url ?? '',
    capturedImageMeta: capture?.meta ?? null,
  })
  close()
}

function captureCompressedFrame() {
  const video = videoRef.value

  if (!video || video.readyState < 2) {
    return Promise.resolve(null)
  }

  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight

  if (!sourceWidth || !sourceHeight) {
    return Promise.resolve(null)
  }

  const scale = Math.min(1, CAPTURE_MAX_WIDTH / sourceWidth, CAPTURE_MAX_HEIGHT / sourceHeight)
  const width = Math.round(sourceWidth * scale)
  const height = Math.round(sourceHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    return Promise.resolve(null)
  }

  context.translate(width, 0)
  context.scale(-1, 1)
  context.drawImage(video, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height)
  const dataUrl = canvas.toDataURL('image/jpeg', CAPTURE_QUALITY)

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve({
            url: dataUrl,
            dataUrl,
            meta: {
              width,
              height,
              size: 0,
              type: 'image/jpeg',
            },
          })
          return
        }

        resolve({
          url: URL.createObjectURL(blob),
          dataUrl,
          meta: {
            width,
            height,
            size: blob.size,
            type: blob.type,
          },
        })
      },
      'image/jpeg',
      CAPTURE_QUALITY
    )
  })
}

function close() {
  stop()
  const shouldPopHistory = hasHistoryEntry
  unbindBackButton()
  if (shouldPopHistory) window.history.back()
  emit('close')
}

function stop() {
  startToken += 1
  isStarting = false
  stopRecordingTimer()
  stopAnalysisLoop()
  stopStream()
  resetAnalysis()
}

function startRecordingTimer() {
  stopRecordingTimer()
  elapsedSeconds.value = 0

  const startedAt = Date.now()
  recordingTimer = window.setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000)
  }, 1000)
}

function stopRecordingTimer() {
  if (recordingTimer) {
    window.clearInterval(recordingTimer)
    recordingTimer = null
  }
}

function stopAnalysisLoop() {
  if (detectTimer) {
    window.clearInterval(detectTimer)
    detectTimer = null
  }
  isDetecting.value = false
}

function stopStream() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  if (videoRef.value) {
    videoRef.value.pause()
    videoRef.value.srcObject = null
  }
}

function bindBackButton() {
  if (hasHistoryEntry) return
  window.history.pushState({ emotionCameraPopup: true }, '')
  window.addEventListener('popstate', handleBackButton)
  hasHistoryEntry = true
}

function unbindBackButton() {
  if (!hasHistoryEntry) return
  window.removeEventListener('popstate', handleBackButton)
  hasHistoryEntry = false
}

function handleBackButton() {
  stop()
  unbindBackButton()
  emit('close')
}

onBeforeUnmount(() => {
  stop()
  unbindBackButton()
})
</script>

<template>
  <Teleport to="body">
    <section
      v-if="show"
      class="emotion-camera"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emotionCameraTitle"
    >
      <header class="emotion-camera__header">
        <button type="button" class="emotion-camera__close" aria-label="닫기" @click="close">닫기</button>
        <!--<h2 id="emotionCameraTitle" class="emotion-camera__title">{{ statusText }}</h2>-->
      </header>
      <div class="emotion-camera__stage" style="background:#fff;">
        <p v-if="cameraError" class="emotion-camera__error">{{ cameraError }}</p>
        <p v-if="modelError" class="emotion-camera__notice">{{ modelError }}</p>
        <div v-if="cameraReady" class="emotion-camera__status">
          <div class="emotion-camera__status-pill">
            <span class="emotion-camera__status-dot emotion-camera__status-dot--recording"></span>
            <span>{{ recordingTimeText }}</span>
          </div>

          <div class="emotion-camera__status-pill emotion-camera__status-pill--ai">
            <span class="emotion-camera__status-dot emotion-camera__status-dot--ai"></span>
            <span>AI 분석 중</span>
          </div>
        </div>
        <video
          v-if="!cameraError"
          ref="videoRef"
          class="camera-video emotion-camera__video"
          autoplay
          muted
          playsinline
        ></video>
        <div
          v-if="faceBox"
          class="emotion-camera__face-box"
          :style="{
            left: `${faceBox.left}px`,
            top: `${faceBox.top}px`,
            width: `${faceBox.width}px`,
            height: `${faceBox.height}px`,
          }"
          aria-hidden="true"
        ></div>
        <div v-else class="emotion-camera__guide" aria-hidden="true"></div>
      </div>

      <div class="emotion-camera__panel">
        <ul class="emotion-camera__bars" aria-label="실시간 표정 분석 결과">
          <h4>실시간 표정 분석</h4>
          <li v-for="item in expressionItems" :key="item.key" class="emotion-camera__bar">
            <span class="emotion-camera__bar-label">{{ item.label }}</span>
            <span class="emotion-camera__bar-track" aria-hidden="true">
              <span
                class="emotion-camera__bar-fill"
                :style="{ width: `${item.percent}%`, backgroundColor: item.color }"
              ></span>
            </span>
            <span class="emotion-camera__bar-value">{{ item.percent }}%</span>
          </li>
        </ul>

      <div class="button-content--duo">
        <button class="btn-ctp--secondary" @click="restart">다시 녹화</button>
        <button class="btn-ctp" :disabled="!modelsReady || !cameraReady || !isDetecting"
            @click="complete"
          >기록완료</button>
      </div>

      </div>
    </section>

  </Teleport>
</template>

<style scoped>
.emotion-camera {
  display:flex;
  flex:0 0 auto;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #111;
  color: #fff;
  position: fixed;
  z-index: 1000;
}

.emotion-camera__header {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 56px;
  padding: 12px 24px 12px 10px;
  background:transparent;
}

.emotion-camera__close {
  position: relative;
  left: 0;
  width: 38px;
  height: 38px;
  padding: 0;
  margin: 0;
  border: 0;
  background: #222;
  mask-image: url("/assets/img/com/ico-prev.svg");
  -webkit-mask-image: url("/assets/img/com/ico-prev.svg");
  mask-repeat: no-repeat;
  mask-size: auto 17px;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: auto 17px;
  -webkit-mask-position: center;
  cursor: pointer;
  transition: background 0.2s ease-in-out;
  font-size: 0;
}


.emotion-camera__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.emotion-camera__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.emotion-camera__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.emotion-camera__status {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
}

.emotion-camera__status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(17, 17, 17, 0.68);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.emotion-camera__status-pill--ai {
  color: #35D7E8;
}

.emotion-camera__status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
}

.emotion-camera__status-dot--recording {
  background: #FF4B4B;
}

.emotion-camera__status-dot--ai {
  background: #35D7E8;
}

.emotion-camera__error,
.emotion-camera__notice {
  position: absolute;
  left: 20px;
  right: 20px;
  z-index: 3;
  margin: 0;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.45;
  text-align: center;
}

.emotion-camera__error {
  top: 50%;
  transform: translateY(-50%);
  background: rgba(220, 38, 38, 0.88);
}

.emotion-camera__notice {
  bottom: 16px;
  background: rgba(17, 17, 17, 0.72);
}

.emotion-camera__face-box,
.emotion-camera__guide {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(62vw, 260px);
  aspect-ratio: 3 / 4;
  border: 2px solid #8be16f;
  border-radius: 24px;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.18);
  pointer-events: none;
}

.emotion-camera__face-box {
  transform: none;
}

.emotion-camera__panel {
  position: absolute;
  bottom:0;
  left:0;
  right:0;
  width:100%;
  z-index: 2;
  padding: 18px 20px calc(20px + env(safe-area-inset-bottom));
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.88) 0%,
    rgba(0, 0, 0, 0.6) 65%,
    rgba(0, 0, 0, 0) 100%
  );

}

.emotion-camera__bars {
  display: grid;
  gap: 5px;
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
}

.emotion-camera__bars h4 { color:rgba(255, 255, 255, 0.5); font-size:10px; display:block; margin-bottom:10px; }

.emotion-camera__bar {
  display: grid;
  grid-template-columns: 52px 1fr 42px;
  gap: 10px;
  align-items: center;
  font-size: 13px;
}

.emotion-camera__bar-track {
  height: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.10);

}

.emotion-camera__bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 160ms ease;
}

.emotion-camera__bar-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.emotion-camera__actions {
  display: flex;
  gap: 10px;
  flex:0 0 94px;
}

.emotion-camera__button {
  min-height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font-size: 15px;
  font-weight: 700;
}

.emotion-camera__button--primary {
  border-color: #8be16f;
  background: #8be16f;
  color: #111;
}

.emotion-camera__button:disabled {
  opacity: 0.45;
}

.btn-ctp--secondary{
  color:#fff;
  border:1px solid rgba(255, 255, 255, 0.2);
  background:rgba(255, 255, 255, 0.15);

 }
</style>
