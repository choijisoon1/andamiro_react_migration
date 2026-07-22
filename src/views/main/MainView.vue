<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import { useAuthStore } from '@/stores/auth'
import { useDiaryStore } from '@/stores/diary'
import { useChatStore } from '@/stores/chat'

const router = useRouter()
const auth   = useAuthStore()
const diary  = useDiaryStore()
const chat   = useChatStore()
const openModal = inject('openModal')

const now   = new Date()
const year  = ref(now.getFullYear())
const month = ref(now.getMonth()) // 0-based
const calendarLoading = ref(false)
let fetchSeq = 0

const yearMonth  = computed(() => `${year.value}-${String(month.value + 1).padStart(2, '0')}`)
const monthLabel = computed(() => `${year.value}.${String(month.value + 1).padStart(2, '0')}`)
const nickname   = computed(() => auth.profile?.nickname ?? auth.user?.email?.split('@')[0] ?? '사용자')

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const EMOTION_KO  = { best: '최고예요!', good: '좋아요!', normal: '보통이에요', bad: '별로예요', worst: '최악이에요' }

// ── 캘린더 셀 배열 ──
const calendarDays = computed(() => {
  const y = year.value
  const m = month.value
  const firstDay = new Date(y, m, 1).getDay()
  const lastDate = new Date(y, m + 1, 0).getDate()
  const cells = Array(firstDay).fill(null)
  for (let d = 1; d <= lastDate; d++) cells.push(d)
  return cells
})

// ── date → emotion 매핑 ──
const emotionMap = computed(() => {
  const map = {}
  for (const d of diary.diaries) map[d.record_date] = d.emotion
  return map
})

function dateStr(day) {
  return `${year.value}-${String(month.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function emotionForDay(day) {
  return day ? (emotionMap.value[dateStr(day)] ?? null) : null
}

// ── 오늘 판별 / 미래 판별 ──
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const isToday  = (day) => !!day && dateStr(day) === todayStr
const isFuture = (day) => !!day && dateStr(day) > todayStr

// ── 날짜 선택 ──
const selectedDay     = ref(null)
const selectedRecords = computed(() =>
  selectedDay.value
    ? diary.diaries.filter(d => d.record_date === dateStr(selectedDay.value))
    : []
)
function selectDay(day) {
  if (!day || isFuture(day)) return
  selectedDay.value = selectedDay.value === day ? null : day
}

// ── 선택 날짜 레이블 ("5월 6일 수요일") ──
const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return ''
  const ds = new Date(`${dateStr(selectedDay.value)}T12:00:00`)
  return `${month.value + 1}월 ${selectedDay.value}일 ${WEEK_LABELS[ds.getDay()]}요일`
})

// ── 기록 요약 텍스트 ──
function getSummary(rec) {
  try {
    const p = JSON.parse(rec.result ?? '')
    return p?.headline ?? p?.insight?.slice(0, 50) ?? ''
  } catch { return rec.content?.slice(0, 50) ?? '' }
}

// ── 기록 시간 포맷 ──
function formatTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── 기록 상세로 이동 ──
function goToRecord(rec) {
  router.push({ path: '/my/chat-view', query: { id: rec.id } })
}
function goToChat() {
  chat.recordDate = selectedDay.value ? dateStr(selectedDay.value) : null
  router.push('/chat/emotion')
}
function hasTodayDraft() {
  const today = new Date().toISOString().split('T')[0]
  return chat.messages.length > 0 && (!chat.recordDate || chat.recordDate === today)
}
function goToTodayChat() {
  if (hasTodayDraft()) {
    if (openModal) {
      openModal({
        title: '오늘 작성중인 기록이 있습니다',
        description: '저장하지 않은 기록이 있어요. 이어서 작성할까요?',
        btnLabel: '작성중인 기록으로 이동',
        onConfirm: () => router.push('/chat'),
      })
    } else {
      router.push('/chat')
    }
    return
  }

  chat.recordDate = null
  router.push('/chat/emotion')
}

// ── 월 이동 ──
async function fetchCalendarMonth(ym) {
  if (!auth.user) return

  const seq = ++fetchSeq
  calendarLoading.value = true

  try {
    await diary.fetchByMonth(ym)
  } finally {
    if (seq === fetchSeq) calendarLoading.value = false
  }
}

function prevMonth() {
  if (month.value === 0) { year.value--; month.value = 11 }
  else month.value--
  selectedDay.value = null
}
function nextMonth() {
  if (month.value === 11) { year.value++; month.value = 0 }
  else month.value++
  selectedDay.value = null
}

watch(
  [() => auth.user, yearMonth],
  ([user, ym]) => {
    if (user) fetchCalendarMonth(ym)
  },
  { immediate: true }
)
</script>

<template>
  <PageLayout title="안다미로" class="main" hide-back>
    <template #body>
    <main class="main-page" role="main">
      <!-- 히어로 -->
      <section class="main-hero">
        <div class="text-content">
          <div class="text-group">
            <span>{{ nickname }}님, 오늘 하루는 어떠셨나요?</span>
            <em>지금 마음을 가볍게 남겨보세요!</em>
          </div>
          <div class="btn-content">
            <button type="button" class="btn-link" @click="goToTodayChat">오늘 기록 남기러 가기</button>
          </div>
        </div>
      </section>
      <!-- 캘린더 -->
      <section class="importance-content round calendar">
        <div class="calendar-grid__item" id="mainCalendarHost" aria-label="월별 캘린더">
          <!--캘린더-->
          <div class="dayflow-cal" role="application" aria-label="월별 달력">

            <!-- 헤더 -->
            <div class="dayflow-cal__head">
              <button type="button" class="title-font-20 dayflow-cal__month-label" aria-label="표시 중인 월">
                {{ monthLabel }}
              </button>
              <div class="dayflow-cal__nav">
                <button type="button" class="dayflow-cal__nav-btn btn--prev" aria-label="이전 달" @click="prevMonth">이전달</button>
                <button type="button" class="dayflow-cal__nav-btn btn--next" aria-label="다음 달" @click="nextMonth">다음달</button>
              </div>
            </div>

            <!-- 요일 행 -->
            <div class="dayflow-cal__dow">
              <span v-for="d in WEEK_LABELS" :key="d" class="dayflow-cal__dow-cell">{{ d }}</span>
            </div>

            <!-- 날짜 그리드 -->
            <div class="dayflow-cal__grid" :class="{ 'is-loading': calendarLoading }">
              <button
                v-for="(day, i) in calendarDays"
                :key="`${yearMonth}-${i}-${day ?? 'empty'}`"
                type="button"
                class="dayflow-cal__day"
                :class="{
                  'dayflow-cal__day--muted':   !day,
                  'dayflow-cal__day--future':  isFuture(day),
                  [`dayflow-cal__day--${emotionForDay(day)}`]: !!emotionForDay(day),
                  'is-today':    isToday(day),
                  'is-selected': selectedDay === day && !!day,
                }"
                :disabled="!day || isFuture(day)"
                :aria-hidden="!day ? 'true' : undefined"
                :data-ymd="day ? dateStr(day) : undefined"
                @click="selectDay(day)"
              >
                <span class="dayflow-cal__clover" aria-hidden="true"></span>
                <span v-if="day" class="dayflow-cal__num">{{ day }}</span>
              </button>
            </div>

          </div>
          <!-- 선택 날짜 기록 -->
          <template v-if="selectedDay">
            <hr>
            <div class="calendar-list">
              <h3 class="title-font-16">
                {{ selectedDayLabel }}
                <span>· {{ selectedRecords.length }}개의 기록</span>
              </h3>

              <!-- 기록 없음 -->
              <ul v-if="selectedRecords.length === 0">
                <li
                  class="calendar-list__empty calendar-list__empty--action"
                  role="button" tabindex="0"
                  @click="goToChat"
                  @keydown.enter="goToChat"
                >
                  아직 작성한 일기가 없어요.
                  <span class="calendar-list__empty-cta">일기쓰러가기</span>
                </li>
              </ul>

              <!-- 기록 1개: 확장형 -->
              <ul v-else-if="selectedRecords.length === 1">
                <li
                  role="button" tabindex="0"
                  @click="goToRecord(selectedRecords[0])"
                  @keydown.enter="goToRecord(selectedRecords[0])"
                >
                  <p>
                    <em>{{ EMOTION_KO[selectedRecords[0].emotion] }}</em>
                    <span class="calendar-list__summary">{{ getSummary(selectedRecords[0]) || '이날의 기록을 함께 돌아봐요.' }}</span>
                  </p>
                </li>
              </ul>

              <!-- 기록 여러개: 시간 리스트 -->
              <ul v-else>
                <li
                  v-for="rec in selectedRecords"
                  :key="rec.id"
                  role="button" tabindex="0"
                  @click="goToRecord(rec)"
                  @keydown.enter="goToRecord(rec)"
                >
                  <span class="calendar-list__time">{{ formatTime(rec.created_at) }}</span>
                  <strong class="calendar-list__name">{{ EMOTION_KO[rec.emotion] }}</strong>
                </li>
              </ul>

            </div>
          </template>
        </div>
      </section>
    </main>
    </template>
    <template #footer>
      <AppTabBar />
    </template>
  </PageLayout>
</template>
