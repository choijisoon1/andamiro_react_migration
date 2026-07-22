<script setup>
import { computed } from 'vue'

const props = defineProps({
  score:     { type: Number, default: 0 },
  colorFrom: { type: String, default: '#6ee7c0' },
  colorTo:   { type: String, default: '#059669' },
})

// 240×168 viewBox, 중심 (120, 84) — ECharts와 동일한 캔버스 중앙
// R=74 ≈ min(120,84) × 88% — ECharts radius:'88%' 재현
// 260° 호: ECharts startAngle=220(좌하), endAngle=-40(우하), 갭 100° 하단 중앙
const CX  = 120
const CY  = 84
const R   = 74
const C   = 2 * Math.PI * R          // 전체 둘레 ≈ 465.0
const TRACK = C * (260 / 360)        // 260° 호 길이 ≈ 335.6
const GAP   = C - TRACK              // 100° 갭 ≈ 129.4

// progressLen만 stroke-dasharray의 첫 값으로 → 260° 안에서만 채움
const progressLen = computed(() => TRACK * (props.score / 100))
const progressGap = computed(() => C - progressLen.value)

const uid    = Math.random().toString(36).slice(2, 8)
const gradId = `sg-${uid}`
</script>

<template>
  <svg viewBox="0 0 240 168" class="svg-gauge" aria-hidden="true">
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   :stop-color="colorFrom" />
        <stop offset="100%" :stop-color="colorTo" />
      </linearGradient>
    </defs>

    <!-- 배경 트랙: 260° 호, rotate(140) → 갭이 하단 중앙 -->
    <circle
      :cx="CX" :cy="CY" :r="R"
      fill="none"
      stroke="#EFF2F3"
      stroke-width="14"
      stroke-linecap="round"
      :stroke-dasharray="`${TRACK} ${GAP}`"
      :transform="`rotate(140 ${CX} ${CY})`"
    />

    <!-- 진행 호: score% 만큼만 채움, CSS transition으로 애니메이션 -->
    <circle
      :cx="CX" :cy="CY" :r="R"
      fill="none"
      :stroke="`url(#${gradId})`"
      stroke-width="14"
      stroke-linecap="round"
      :stroke-dasharray="`${progressLen} ${progressGap}`"
      :transform="`rotate(140 ${CX} ${CY})`"
      class="svg-gauge__arc"
    />
  </svg>
</template>

<style scoped>
.svg-gauge {
  width: 240px;
  height: 168px;
}
.svg-gauge__arc {
  transition: stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
