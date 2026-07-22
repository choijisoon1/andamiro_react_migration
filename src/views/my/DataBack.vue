<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import FooterCtp from '@/components/layout/FooterCtp.vue'
import NoData from '@/components/common/NoData.vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const auth = useAuthStore()
const router = useRouter()
const PAGE_SIZE = 15
const diaries = ref([])
const loading = ref(false)
const downloading = ref(false)
const deleting = ref(false)
const visibleCount = ref(PAGE_SIZE)
const selectedIds = ref(new Set())

const currentUserId = computed(() => auth.user?.id ?? null)
const isLoading = computed(() => auth.loading || loading.value)
const backupItems = computed(() => diaries.value)
const visibleBackupItems = computed(() =>
  backupItems.value.slice(0, visibleCount.value)
)
const hasMoreItems = computed(() =>
  visibleCount.value < backupItems.value.length
)
const currentPage = computed(() =>
  Math.ceil(visibleCount.value / PAGE_SIZE)
)
const totalPages = computed(() =>
  Math.ceil(backupItems.value.length / PAGE_SIZE)
)
const selectedCount = computed(() => selectedIds.value.size)
const isAllSelected = computed(() =>
  backupItems.value.length > 0 && backupItems.value.every(item => selectedIds.value.has(item.id))
)
const actionLabel = computed(() => (isAllSelected.value ? '해제' : '전체선택'))

watch(
  currentUserId,
  async (userId) => {
    if (!userId) return
    await fetchDiaries(userId)
  },
  { immediate: true }
)

watch(backupItems, (items) => {
  const nextIds = new Set(items.map(item => item.id))
  selectedIds.value = new Set([...selectedIds.value].filter(id => nextIds.has(id)))
  visibleCount.value = PAGE_SIZE
})

async function fetchDiaries(userId) {
  loading.value = true

  try {
    const { data, error } = await supabase
      .from('emotion_records')
      .select('*')
      .eq('user_id', userId)
      .order('record_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    diaries.value = data ?? []
  } catch (error) {
    console.error('일기 백업 데이터 조회 실패:', error)
    diaries.value = []
  } finally {
    loading.value = false
  }
}

function isSelected(id) {
  return selectedIds.value.has(id)
}

function toggleSelect(id) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleSelectAll() {
  selectedIds.value = isAllSelected.value
    ? new Set()
    : new Set(backupItems.value.map(item => item.id))
}

function showMore() {
  visibleCount.value = Math.min(
    visibleCount.value + PAGE_SIZE,
    backupItems.value.length
  )
}

function goHome() {
  router.push('/main')
}

function formatPostDate(dateValue) {
  if (!dateValue) return ''
  const target = String(dateValue).includes('T')
    ? new Date(dateValue)
    : new Date(`${dateValue}T12:00:00`)
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return '오늘'
  if (diffDays <= 5) return `${diffDays}일전`
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

function formatFileDate() {
  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function emotionIconSrc(emotion) {
  const validEmotions = ['best', 'good', 'normal', 'bad', 'worst']
  return validEmotions.includes(emotion)
    ? `/assets/img/emotion/ico-${emotion}.png`
    : '/assets/img/emotion/img-none.png'
}

function emotionBgStyle(emotion) {
  const validEmotions = ['best', 'good', 'normal', 'bad', 'worst']
  const bgName = validEmotions.includes(emotion) ? emotion : 'normal'
  return {
    backgroundImage: `url(/assets/img/emotion/bg-${bgName}.png)`,
  }
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function createCsv(posts) {
  const headers = [
    ['record_date', '기록일'],
    ['emotion', '감정'],
    ['content', '내용'],
    ['result', '분석 결과'],
    ['chat_messages', '채팅 기록'],
    ['created_at', '작성일'],
  ]

  const headerRow = headers.map(([, label]) => escapeCsvValue(label)).join(',')
  const rows = posts.map(post =>
    headers.map(([key]) => escapeCsvValue(post[key])).join(',')
  )

  return [headerRow, ...rows].join('\n')
}

function downloadSelected() {
  if (downloading.value || selectedIds.value.size === 0) return

  downloading.value = true

  try {
    const selectedPosts = backupItems.value.filter(post => selectedIds.value.has(post.id))
    // JSON 백업이 필요해지면 아래 Blob을 다시 사용한다.
    // const blob = new Blob([JSON.stringify(selectedPosts, null, 2)], {
    //   type: 'application/json',
    // })

    const blob = new Blob([`\uFEFF${createCsv(selectedPosts)}`], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `diary-backup-${formatFileDate()}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  } finally {
    downloading.value = false
  }
}

async function deleteSelected() {
  if (deleting.value || selectedIds.value.size === 0 || !currentUserId.value) return
  if (!window.confirm('선택한 데이터를 삭제할까요? 삭제한 데이터는 복구할 수 없어요.')) return

  deleting.value = true

  try {
    const ids = [...selectedIds.value]
    const { error } = await supabase
      .from('emotion_records')
      .delete()
      .eq('user_id', currentUserId.value)
      .in('id', ids)

    if (error) throw error

    diaries.value = diaries.value.filter(item => !selectedIds.value.has(item.id))
    selectedIds.value = new Set()
  } catch (error) {
    console.error('일기 백업 데이터 삭제 실패:', error)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <PageLayout
    title="데이터 백업"
    back-to="/my"
    :action-label="actionLabel"
    @action="toggleSelectAll"
  >
    <template #body>
      <main class="list-body databack-page">
        <section class="list-content">
          <LoadingSkeleton v-if="isLoading" type="exchange-list" :count="3" />
          <NoData
            v-else-if="backupItems.length === 0"
            title="백업할 데이터가 없어요"
            description="작성한 일기가 생기면<br/> 이곳에서 백업할 수 있어요."
          />
          <ul v-else>
            <li
              v-for="post in visibleBackupItems"
              :key="post.id"
              class="exch-item"
              :class="{ 'is-selected': isSelected(post.id) }"
              @click="toggleSelect(post.id)"
            >
              <p class="thumb-box" :style="emotionBgStyle(post.emotion)">
                <img
                  :src="emotionIconSrc(post.emotion)"
                  class="item__thumb"
                  :alt="post.emotion || '감정'"
                />
              </p>
              <div class="list-box">
                <p class="title">{{ post.content || '기록된 일기' }}</p>
                <p class="sub-text">
                  <!--<span class="read">{{ post.record_date }}</span>-->
                  <span class="date">{{ formatPostDate(post.record_date || post.created_at) }}</span>
                </p>
                <!--<p class="sub-text">
                  <span class="speech">전체 일기 백업</span>
                </p>-->
              </div>
              <button
                type="button"
                class="button-check"
                :class="{ 'is-selected': isSelected(post.id) }"
                :aria-pressed="String(isSelected(post.id))"
                aria-label="백업 항목 선택"
                @click.stop="toggleSelect(post.id)"
              ></button>
            </li>
          </ul>
          <div v-if="hasMoreItems" class="btn-content">
            <button
              type="button"
              class="btn-more"
              @click="showMore"
            >
              <p>
                더보기
                <span>
                  (<em>{{ currentPage }}</em>/<span>{{ totalPages }}</span>)
                </span>
              </p>
            </button>
          </div>
        </section>
      </main>
      <FooterCtp
        v-if="backupItems.length > 0"
        :label="downloading ? '다운로드 중…' : '다운로드하기'"
        :disabled="downloading || deleting || selectedCount === 0"
        :secondary-label="deleting ? '삭제 중…' : '데이터 삭제'"
        :secondary-disabled="deleting || downloading || selectedCount === 0"
        @click="downloadSelected"
        @secondary-click="deleteSelected"
      />
      <FooterCtp
        v-else
        label="홈으로"
        @click="goHome"
      />
    </template>

  </PageLayout>
</template>

<style scoped lang="scss">
.databack-page {
  background:#fff;
}

.databack-more {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}


</style>
