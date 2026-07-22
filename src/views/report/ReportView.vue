<script setup>
import { computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import NoData from '@/components/common/NoData.vue'
import { useDiaryStore } from '@/stores/diary'

use([CanvasRenderer, BarChart, GridComponent])

const diary = useDiaryStore()
const hasData = computed(() => diary.diaries.length > 0)

const now = new Date()
const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const monthLabel = `${now.getMonth() + 1}월`

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const SCORE_BY_EMOTION = { best: 92, good: 72, normal: 58, bad: 42, worst: 28 }
const EMOTION_KO = {
  best: '최고예요', good: '좋아요', normal: '보통이에요', bad: '별로예요', worst: '최악이에요',
}

// 요일별 평균 점수
const weekdayEnergy = computed(() => {
  const buckets = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }))
  for (const d of diary.diaries) {
    const day = new Date(d.record_date + 'T12:00:00').getDay()
    buckets[day].sum += SCORE_BY_EMOTION[d.emotion] ?? 58
    buckets[day].count++
  }
  return buckets.map(b => b.count ? Math.round(b.sum / b.count) : 0)
})

const VALID_EMOTIONS = new Set(['best', 'good', 'normal', 'bad', 'worst'])

// 감정 순위 (최대 5개)
const emotionRanking = computed(() => {
  const counts = {}
  for (const d of diary.diaries) {
    if (VALID_EMOTIONS.has(d.emotion)) counts[d.emotion] = (counts[d.emotion] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotion, count]) => ({ emotion, count, name: EMOTION_KO[emotion] }))
})

// 패턴 인사이트
const insights = computed(() => {
  const list = []
  const ranking = emotionRanking.value
  const energy  = weekdayEnergy.value
  const nonZero = energy.map((v, i) => ({ v, i })).filter(x => x.v > 0)

  if (ranking.length > 0)
    list.push(`이번 달 베이스 감정은 '${ranking[0].name}'으로 ${ranking[0].count}번 기록됐어요.`)

  if (nonZero.length >= 2) {
    const maxDay = nonZero.reduce((a, b) => a.v > b.v ? a : b)
    const minDay = nonZero.reduce((a, b) => a.v < b.v ? a : b)
    if (maxDay.i !== minDay.i)
      list.push(`${DAYS[maxDay.i]}요일에 에너지가 높고 ${DAYS[minDay.i]}요일에 낮아지는 패턴이 보여요.`)
  }

  const neg = ranking.filter(r => r.emotion === 'bad' || r.emotion === 'worst')
  if (neg.length > 0) {
    list.push(`부정적 감정이 ${neg.reduce((s, r) => s + r.count, 0)}번 기록됐어요. 충분한 휴식을 챙겨봐요.`)
  } else if (ranking.length >= 2) {
    list.push(`'${ranking[0].name}'이 베이스 감정으로, 안정적인 흐름을 유지하고 있어요.`)
  }

  return list
})

// ── 바 차트 ──
const BAR_COLORS = ['#79AAFF', '#A2C4FF', '#C8DCFF', '#C8DCFF', '#E6EFFF', '#C8DCFF', '#A2C4FF']

const barOption = computed(() => ({
  animation: true,
  animationDuration: 800,
  animationEasing: 'cubicOut',
  grid: { left: 0, right: 0, top: 8, bottom: 24, containLabel: true },
  xAxis: {
    type: 'category',
    data: DAYS,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#999', fontSize: 12, fontFamily: 'Pretendard, sans-serif' },
  },
  yAxis: { show: false, max: 100 },
  series: [{
    type: 'bar',
    data: weekdayEnergy.value,
    barWidth: '70%',
    itemStyle: {
      borderRadius: [6, 6, 0, 0],
      color: (params) => BAR_COLORS[params.dataIndex],
    },
  }],
}))

// ── 버블 차트 (CSS 기반) ──
const BUBBLE_CENTERS = [[29, 46], [63, 34], [53, 74], [24, 79], [79, 63]] // [left%, top%]

const bubbleItems = computed(() => {
  const items = emotionRanking.value
  if (!items.length) return []
  const maxCount = items[0].count
  return items.map((item, i) => {
    const size = Math.round((item.count / maxCount) * 80 + 75)
    const [cx, cy] = BUBBLE_CENTERS[i] ?? [50, 50]
    return {
      ...item,
      style: {
        left:            `calc(${cx}% - ${size / 2}px)`,
        top:             `calc(${cy}% - ${size / 2}px)`,
        width:           `${size}px`,
        height:          `${size}px`,
        '--enter-delay': `${i * 200}ms`,
      },
    }
  })
})

watch(() => auth.user, (user) => {
  if (user) diary.fetchByMonth(yearMonth)
}, { immediate: true })
</script>

<template>
  <PageLayout title="리포트" hide-back hide-right>
    <template #body>
      <main class="report-main">
        <!-- 데이터 있을 때 -->
        <template v-if="hasData">
          <!-- 히어로 -->
          <section class="report-hero">
            <div class="text-content">
              <div class="text-group">
                <p class="tit">
                  <span>{{ monthLabel }}의 감정은 어땠을까요?</span>
                  <em>한 달의 마음 흐름을 돌아보세요!</em>
                </p>
              </div>
            </div>
          </section>
          <section class="importance-content round">
            <!-- 요일별 에너지 -->
            <div class="report-panel">
              <div class="text-content">
                <div class="text-group">
                  <p class="text-sub">이번 달 요일별 평균</p>
                  <h2>요일별 에너지</h2>
                </div>
              </div>
              <VChart class="report-bar-chart" :option="barOption" autoresize />
            </div>
            <hr />
            <!-- 이번달 감정 순위 -->
            <div class="report-panel">
              <div class="text-content">
                <div class="text-group">
                  <p class="text-sub">감정 리포트</p>
                  <h2>이번달 감정 순위</h2>
                </div>
              </div>
              <div class="report-bubble-wrap">
                <template v-if="bubbleItems.length">
                  <div
                    v-for="(item, i) in bubbleItems"
                    :key="item.emotion"
                    class="r-bubble"
                    :class="`r-bubble--${i}`"
                    :style="item.style"
                  >
                    <span class="r-bubble__name">{{ item.name }}</span>
                    <span class="r-bubble__count">{{ item.count }}일</span>
                  </div>
                </template>
                <p v-else class="report-empty">감정을 선택해 기록하면 순위가 보여요.</p>
              </div>
            </div>
          </section>
          <!-- 패턴 인사이트 -->
          <section class="card-content">
            <div class="card-item report-insight-card">
              <h3>
                <span class="icon01"></span>
                패턴 인사이트
              </h3>
              <ul v-if="insights.length" class="insight-list">
                <li v-for="(text, i) in insights" :key="i" class="insight-item">
                  <span class="insight-item__avatar"></span>
                  <p>{{ text }}</p>
                </li>
              </ul>
              <p v-else class="report-empty">기록이 쌓이면 패턴을 분석해드려요.</p>
            </div>
          </section>
        </template>

          <!-- 데이터 없을 때 -->
          <NoData v-else buttonLabel="일기 쓰러가기" />
      </main>
    </template>
    <template #footer>
      <AppTabBar />
    </template>
  </PageLayout>
</template>
