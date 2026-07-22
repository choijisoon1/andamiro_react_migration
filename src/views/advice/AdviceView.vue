<script setup>
import { ref, computed, onMounted } from 'vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import NoData from '@/components/common/NoData.vue'
import ModalFull from '@/components/layout/modalFull.vue'
import { useDiaryStore } from '@/stores/diary'
import { useAdviceEnricher } from '@/composables/useAdviceEnricher'

const diary = useDiaryStore()
const { enrich } = useAdviceEnricher()

const today = new Date()
const todayStr = today.toISOString().split('T')[0]

const SCORE_BY_EMOTION = { best: 92, good: 72, normal: 58, bad: 42, worst: 28 }
const EMOTION_KO = { best: '최고예요!', good: '좋아요!', normal: '보통이에요', bad: '별로예요', worst: '최악이에요' }
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

const FORTUNES = [
  '오후 3시, 달콤한 커피 한 잔이 당신의 운을 깨워줄 거예요.',
  '이미 당신 마음 속에 답이 있어요. 그 길을 믿고 나아가세요.',
  '조금 늦더라도 괜찮아요. 당신의 속도는 틀리지 않았습니다.',
  '오늘은 주변의 조언보다 당신의 직감을 따르는 것이 좋습니다.',
  '생각보다 큰 행운이 가까이 와 있어요. 마음을 열고 기다려보세요.',
  '완벽하지 않아도 괜찮습니다. 시작했다는 것만으로도 충분해요.',
]

const showFortune = ref(false)
const isOpened = ref(false)
const isAnimating = ref(false)
const fortuneText = ref('')
const cookieSrc = ref('/assets/img/advice/popup-img-fortune.png')

function openCookie() {
  if (isAnimating.value || isOpened.value) return
  isAnimating.value = true
  setTimeout(() => {
    cookieSrc.value = '/assets/img/advice/popup-img-fortune.png'
    const msg = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
    setTimeout(() => {
      fortuneText.value = msg
      isOpened.value = true
      isAnimating.value = false
    }, 800)
  }, 1200)
}

function closeFortune() {
  showFortune.value = false
  isOpened.value = false
  isAnimating.value = false
  fortuneText.value = ''
  cookieSrc.value = '/assets/img/advice/popup-img-fortune.png'
}

const record = ref(null)
const hasData = computed(() => !!record.value)

const dateLabel = computed(() => {
  const m = today.getMonth() + 1
  const d = today.getDate()
  const day = DAYS[today.getDay()]
  return `${m}월 ${d}일 ${day}요일`
})

const score = computed(() => SCORE_BY_EMOTION[record.value?.emotion] ?? 0)

const parsed = computed(() => {
  try { return JSON.parse(record.value?.result ?? '') }
  catch { return null }
})
const headline = computed(() =>
  parsed.value?.headline ?? EMOTION_KO[record.value?.emotion] ?? '오늘의 감정'
)
const adviceText = computed(() =>
  parsed.value?.insight ?? record.value?.result ?? ''
)
const colorText = computed(() => parsed.value?.color ?? '')
const tags = computed(() => parsed.value?.tags ?? [])
const tips = computed(() => parsed.value?.tips ?? [])
const tipTitle = title => title === '내일을 위한 루틴' ? '내일을 위한 조언' : title

onMounted(async () => {
  record.value = await diary.getByDate(todayStr)
  if (!record.value) return

  const p = parsed.value
  if (p && (!p.color || !p.tags || !p.tips)) {
    try {
      const extra = await enrich(record.value.emotion, p?.insight ?? record.value.result ?? '')
      const merged = { ...p, ...extra }
      record.value = { ...record.value, result: JSON.stringify(merged) }
      await diary.updateResult(record.value.id, record.value.result)
    } catch { /* 실패해도 기존 데이터 그대로 표시 */ }
  }
})
</script>

<template>
  <PageLayout title="조언" body-class="advice-page" hide-back hide-right>
    <template #body>
      <main class="advice-page">
        <!-- 데이터 있을 때 -->
        <template v-if="hasData">
          <section class="importance-content">
            <div class="button-content" aria-label="포춘쿠키">
              <button type="button" class="advice-fortune-btn" @click="showFortune = true">
                <span>포춘쿠키를 확인하세요</span>
              </button>
            </div>
            <div class="text-content">
              <div class="text-group">
                <p class="advice-hero__date">{{ dateLabel }}</p>
                <h2 class="advice-hero__headline">{{ headline }}</h2>
                <p class="advice-hero__score">
                  <span class="advice-hero__score-num">{{ score }}</span>
                  <span class="advice-hero__score-unit">점</span>
                </p>
              </div>
            </div>
          </section>

          <section class="card-content">
            <div class="card-item" v-if="colorText || tags.length">
              <p class="advice-color-card__text">{{ colorText }}</p>
              <div class="advice-tags" v-if="tags.length">
                <span v-for="tag in tags" :key="tag" class="advice-tags__item"># {{ tag }}</span>
              </div>
            </div>
            <div class="card-item" v-if="adviceText">
              <h3>
                <span class="icon01"></span>
                AI 맞춤 조언
              </h3>
              <p class="advice-ai-body">{{ adviceText }}</p>
              <template v-if="tips.length">
                <div v-for="tip in tips" :key="tip.title" class="card-tips">
                  <h4>{{ tipTitle(tip.title) }}</h4>
                  <p>{{ tip.body }}</p>
                </div>
              </template>
            </div>
          </section>
        </template>

        <!-- 데이터 없을 때 -->
        <NoData
          v-else
          title="오늘의 감정을 기록하면&#10;맞춤 조언을 드려요!"
          description="하루를 기록하고 AI의 따뜻한 조언을 받아보세요."
          buttonLabel="일기 쓰러가기"
        />
      </main>
    </template>
    <template #footer>
      <AppTabBar />
    </template>
  </PageLayout>

  <ModalFull :show="showFortune" modal-class="modal-fortune" body-class="body-fortune" @close="closeFortune">
    <h3 class="popup-fortune__tit">
      <img src="/assets/img/advice/popup-fortune-tit.png" alt="오늘의 운세" />
    </h3>
    <div class="fortune-cookie-block">
      <p class="text">바삭한 쿠키속에 숨겨진 <strong>당신의 행운</strong>을 확인해보세요!</p>
      <div class="fortune-glow" aria-hidden="true"></div>
      <div
        class="cookie-container"
        role="button"
        tabindex="0"
        aria-label="포춘쿠키 열기"
        @click="openCookie"
        @keydown.enter.prevent="openCookie"
        @keydown.space.prevent="openCookie"
      >
        <img
          v-show="!isOpened"
          :src="cookieSrc"
          :class="['cookie-img', { shaking: isAnimating }]"
          alt="포춘쿠키"
        />
        <p v-show="!isOpened" class="text box">
          쿠키를 눌러 오늘의<br />운세를 확인하세요
        </p>
        <div v-show="isOpened" class="fortune-text">
          <p>{{ fortuneText }}</p>
        </div>
      </div>

    </div>
  </ModalFull>
</template>

<style lang="scss">
.advice-page {
  main > section > .button-content { padding: 0; }
  .card-item {
    & {
      --card-tips-bg:   #F2F9F3;
      --card-tips-text: #7AC47D;
      h3 {
        span {
          background-color:#fff;
          &.icon01::before {
            background: #74A37B;
            mask-image: url("/assets/img/advice/ico-01.svg");
            -webkit-mask-image: url("/assets/img/advice/ico-01.svg");
            }
      }
        }
    }

    }



 }
.modal-fortune {
  .modal-full__body {
  padding: 70px 0 20px;
  .popup-fortune__tit { display: block; width: 100%; max-width: 290px; margin: 0 auto; }
  .fortune-cookie-block {
    max-width: 375px; height: 500px; margin: 0 auto; background: url("/assets/img/advice/popup-bg-fortune.png") no-repeat center -100px / 100%;
    .cookie-img { display:block; margin:0 auto; max-width:250px; width:90%;
      &.shaking { animation: shake 0.15s ease-in-out infinite; }
    }
    p {
      width:100%; text-align:center; margin:22px auto;
      strong { color:$primary; }
    }
    .box {   max-width:307px; margin:0 auto; padding:20px; background:$white; border-radius:20px; box-shadow: 0 4px 4px 0 rgba(221, 221, 221, 0.20); }

  }
  .fortune-text {
    display:flex; align-items:center; width:310px; height:210px; margin:0 auto; position:relative;
    background:url("/assets/img/advice/popup-bg-fortune2.png") no-repeat center / 310px auto;
    p { padding:0 20px; width:75%; font-size:$font18; color:$title; }
   }
}
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-6px) rotate(-2deg); }
  75%       { transform: translateX(6px) rotate(2deg); }
}
</style>
