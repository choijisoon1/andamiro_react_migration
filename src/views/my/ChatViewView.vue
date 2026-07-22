<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GaugeChart } from 'echarts/charts'
import VChart from 'vue-echarts'
import PageLayout from '@/components/layout/PageLayout.vue'
import FooterCtp from '@/components/layout/FooterCtp.vue'
import { useDiaryStore } from '@/stores/diary'

use([CanvasRenderer, GaugeChart])

const route  = useRoute()
const router = useRouter()
const diary  = useDiaryStore()

const EMOTION_KO = { best: '최고예요!', good: '좋아요!', normal: '보통이에요', bad: '별로예요', worst: '최악이에요' }

const GAUGE_COLORS = {
  best:   { from: '#FFE066', to: '#FF8C00' },
  good:   { from: '#6ee7c0', to: '#059669' },
  normal: { from: '#b8d9ff', to: '#2f6feb' },
  bad:    { from: '#d8b4fe', to: '#7c3aed' },
  worst:  { from: '#fca5a5', to: '#dc2626' },
}

const record = ref(null)
const loading = ref(true)

function queryId() {
  const v = route.query.id ?? route.query.date
  return Array.isArray(v) ? v[0] : v
}

function parseStored(raw, contentFallback) {
  if (raw == null || raw === '') return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return { insight: String(raw), summary: contentFallback ?? '' }
  }
}

const parsed = computed(() => parseStored(record.value?.result, record.value?.content))

const analysis = computed(() => {
  const r = record.value
  if (!r) return null
  const p = parsed.value
  const emotion = r.emotion ?? 'normal'

  const recommendations =
    Array.isArray(p.recommendations) && p.recommendations.length
      ? p.recommendations
      : (Array.isArray(p.tips)
        ? p.tips.map(t => ({ title: t.title ?? '', body: t.body ?? '' }))
        : [])

  const score = typeof p.score === 'number' && !Number.isNaN(p.score) ? p.score : null
  let metrics = p.metrics && typeof p.metrics === 'object' ? { ...p.metrics } : null
  if (score != null && !metrics) {
    metrics = { 에너지: score, 안정감: score, 집중력: score, 긍정성: score }
  }

  return {
    mood: p.mood || p.headline || EMOTION_KO[emotion] || '기록',
    score,
    metrics,
    insight: p.insight || '',
    summary: p.summary || (r.content ?? '').slice(0, 500),
    recommendations,
  }
})

const gaugeColors = computed(() => GAUGE_COLORS[record.value?.emotion] ?? GAUGE_COLORS.normal)

const showGauge = computed(() => analysis.value?.score != null)

const title = computed(() => analysis.value?.mood ?? '')
const scores = computed(() => {
  const m = analysis.value?.metrics
  if (!m) return []
  return Object.entries(m).map(([label, val]) => ({ label, val }))
})

const gaugeScore = ref(0)
const mainScore  = ref(0)

const gaugeOption = computed(() => ({
  animation: true,
  animationDuration: 1200,
  animationEasing: 'cubicOut',
  series: [{
    type: 'gauge',
    startAngle: 220,
    endAngle: -40,
    min: 0,
    max: 100,
    radius: '88%',
    roundCap: true,
    progress: {
      show: true,
      roundCap: true,
      width: 14,
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: gaugeColors.value.from },
            { offset: 1, color: gaugeColors.value.to },
          ],
        },
      },
    },
    axisLine: {
      roundCap: true,
      lineStyle: { width: 14, color: [[1, '#EFF2F3']] },
    },
    pointer:   { show: false },
    axisTick:  { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    title:     { show: false },
    detail:    { show: false },
    data: [{ value: gaugeScore.value }],
  }],
}))

function animateScore(target) {
  gaugeScore.value = target
  const duration = 1200
  const start = Date.now()
  const tick = () => {
    const p = Math.min((Date.now() - start) / duration, 1)
    mainScore.value = Math.round((1 - Math.pow(1 - p, 3)) * target)
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function goHome() {
  router.push('/main')
}

onMounted(async () => {
  const id = queryId()
  if (!id || typeof id !== 'string') {
    router.replace('/main')
    loading.value = false
    return
  }
  try {
    const isUuid = /^[0-9a-f-]{36}$/i.test(id)
    record.value = isUuid
      ? (diary.diaries.find(d => d.id === id) ?? await diary.getById(id))
      : (diary.diaries.find(d => d.record_date === id) ?? await diary.getByDate(id))

    if (!record.value) {
      router.replace('/main')
      return
    }
    if (showGauge.value) animateScore(analysis.value.score)
    else { gaugeScore.value = 0; mainScore.value = 0 }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <PageLayout title="일기 분석" back-to="/main">
    <template #body>
      <main class="result-main">

        <div v-if="loading" class="result-loading">
          <div class="result-loading__dots">
            <span></span><span></span><span></span>
          </div>
          <p>기록을 불러오는 중이에요…</p>
        </div>

        <template v-else-if="analysis">
          <section class="importance-content">
            <div class="text-content">
              <div class="text-group">
                <span>저장된 분석</span>
                <em>{{ showGauge ? '이날의 감정 점수' : '이날의 기록' }}</em>
              </div>
            </div>

            <div v-if="showGauge" class="grap-content">
              <div class="grap-group score-chart">
                <VChart class="gauge-chart" :option="gaugeOption" autoresize />
                <div class="gauge-center">
                  <p class="gauge-title">{{ title }}</p>
                  <p class="gauge-score">{{ mainScore }}</p>
                  <p class="gauge-label">SCORE</p>
                </div>
              </div>
              <div v-if="scores.length" class="grap-group score-list">
                <div v-for="item in scores" :key="item.label" class="score-item">
                  <span class="score-item__val">{{ item.val }}</span>
                  <div class="score-item__bar">
                    <div class="score-item__fill" :style="{ width: item.val + '%' }"></div>
                  </div>
                  <span class="score-item__label">{{ item.label }}</span>
                </div>
              </div>
            </div>
          </section>

          <section class="card-content">
            <div class="card-item">
              <h3>
                <span class="icon01"></span>
                그날은 이렇게 보내고 있었네요!
              </h3>
              <p class="result-insights">{{ analysis.insight || '이날의 감정 기록을 되돌아봐요.' }}</p>
              <div class="card-tips">
                <h4>채팅 요약</h4>
                <p>{{ analysis.summary }}</p>
              </div>
            </div>
            <!--<div v-if="analysis.recommendations.length" class="card-item">
              <h3>
                <span class="icon02"></span>
                내일은 이렇게 준비해보세요!
              </h3>
              <ol class="card-ol-list">
                <li v-for="(rec, i) in analysis.recommendations" :key="i" class="result-reco">
                  <em>{{ rec.title }}</em>
                  <p>{{ rec.body }}</p>
                </li>
              </ol>
            </div>-->
          </section>
        </template>

      </main>
      <FooterCtp
        label="홈으로"
        @click="goHome"
      />
    </template>
  </PageLayout>
</template>

<style scoped lang="scss">
.result-main {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 24px;
}

.result-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 0;
  color: $text-sub;
  font-size: $font14;

  &__dots {
    display: flex;
    gap: 6px;
    span {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: $primary;
      animation: result-bounce 1.2s infinite ease-in-out;
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }
}
@keyframes result-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%            { transform: translateY(-6px); opacity: 1; }
}

.text-content { margin-bottom: 8px; }
.text-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grap-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.grap-group.score-chart {
  position: relative;
  width: 240px;
  height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gauge-chart {
  width: 240px;
  height: 168px;
}
.gauge-center {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -38%);
  gap: 2px;
  pointer-events: none;
}
.gauge-title { font-size: $font14; color: $text-sub; }
.gauge-score {
  font-size: 44px;
  font-weight: $font-eb;
  color: $title;
  line-height: 1;
}
.gauge-label {
  font-size: $font12;
  color: $text-disabled;
  font-weight: $font-m;
  letter-spacing: 0.08em;
}

.grap-group.score-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
}
.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.score-item__label { color: $text-sub; }
.score-item__val {
  font-size: $font16;
  font-weight: $font-sb;
  color: $title;
}
.score-item__bar {
  width: 100%;
  height: 14px;
  background: #eef3fc;
  border-radius: 4px;
  overflow: hidden;
}
.score-item__fill {
  height: 100%;
  background: linear-gradient(90deg, v-bind('gaugeColors.from'), v-bind('gaugeColors.to'));
  border-radius: 100px;
  transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-item {
  &:first-of-type {
    --card-tips-bg:   #FFFCF6;
    --card-tips-text: #786258;
  }
  &:nth-of-type(2) h3 span { background-color: #F0F9F1; }
}

.icon01::before {
  background: #ffa014;
  mask-image: url("/assets/img/result/ico-01.svg");
  -webkit-mask-image: url("/assets/img/result/ico-01.svg");
}
.icon02::before {
  background: #7AC47D;
  mask-image: url("/assets/img/result/ico-02.svg");
  -webkit-mask-image: url("/assets/img/result/ico-02.svg");
}
</style>
