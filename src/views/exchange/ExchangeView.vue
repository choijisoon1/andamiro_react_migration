<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import TabMenu from '@/components/layout/TabMenu.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import NoData from '@/components/common/NoData.vue'
import { useExchangeStore } from '@/stores/exchange'
import { useAuthStore } from '@/stores/auth'

const router   = useRouter()
const route    = useRoute()
const exchange = useExchangeStore()
const auth     = useAuthStore()

const activeTab = ref('mine')
const tabs = [
  { key: 'mine',   label: '내가 공유한' },
  { key: 'shared', label: '공유 받은' },
]
const currentUserId = computed(() => auth.user?.id ?? null)
const myPosts = computed(() =>
  exchange.posts.filter(post => post._role === 'owner' && post.user_id === currentUserId.value)
)
const sharedPosts = computed(() =>
  exchange.posts.filter(post => post._role === 'member' && post.user_id !== currentUserId.value)
)
const filteredPosts = computed(() =>
  activeTab.value === 'mine' ? myPosts.value : sharedPosts.value
)
const isLoading = computed(() => auth.loading || exchange.loading)

const joinPost      = ref(null)
const inviteToken   = ref('')
const joinPw        = ref('')
const showJoinPw    = ref(false)
const joinError     = ref('')
const joinLoading   = ref(false)

async function handleJoin() {
  if (!inviteToken.value || joinLoading.value) return
  joinError.value   = ''
  joinLoading.value = true
  try {
    const postId = await exchange.acceptInvitation(inviteToken.value, joinPw.value)
    if (postId === false) { joinError.value = '비밀번호가 틀렸어요.'; return }
    joinPost.value  = null
    inviteToken.value = ''
    joinPw.value    = ''
    router.push(`/exchange/view/${postId}`)
  } catch (e) {
    joinError.value = e?.message || '입장 중 오류가 발생했어요.'
  } finally {
    joinLoading.value = false
  }
}

async function handleDelete(e, id) {
  e.stopPropagation()
  if (activeTab.value !== 'mine') return
  if (!confirm('방을 삭제하면 댓글도 모두 삭제됩니다. 삭제할까요?')) return
  await exchange.deletePost(id)
}

watch(() => auth.user, async (u) => {
  if (!u) return
  await exchange.fetchPosts('all')
}, { immediate: true })

onMounted(async () => {
  const token = route.query.invite
  if (!token) return
  try {
    const preview = await exchange.getInvitationPreview(token)
    if (!preview?.post) {
      joinError.value = '유효하지 않은 초대 링크예요.'
      joinPost.value  = { title: '초대 오류' }
      return
    }
    inviteToken.value = token
    joinPost.value    = preview.post
  } catch {
    joinError.value = '초대 정보를 불러오지 못했어요.'
    joinPost.value  = { title: '초대 오류' }
  }
})


function goToPost(id) {
  router.push(`/exchange/view/${id}`)
}

function formatPostDate(dateValue) {
  if (!dateValue) return ''
  const target = new Date(dateValue)
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
</script>

<template>
  <PageLayout title="공유일기" back-to="/my">
    <template #body>
      <main class="list-body">
        <TabMenu v-model="activeTab" :tabs="tabs" />
        <section class="list-content">
          <LoadingSkeleton v-if="isLoading" type="exchange-list" :count="3" />
          <NoData
            v-else-if="filteredPosts.length === 0"
            title="아직 공유한 일기가 없어요"
            description="일기를 만들고 소중한 사람에게<br/> 초대 링크를 공유해 보세요."
          />
          <ul v-else>
            <li
              v-for="post in filteredPosts"
              :key="post.id"
              class="exch-item"
              @click="goToPost(post.id)"
            >
              <p class="thumb-box">
                <img v-if="post.image_url" :src="post.image_url" class="item__thumb" alt="" />
              </p>
              <div class="list-box">
                <p class="title">{{ post.title }}</p>
                <p class="sub-text">
                  <span v-if="activeTab === 'mine'" class="read">{{ post.read_count ?? 0 }}명이 읽었어요</span>
                  <span v-else class="n-name">{{ post.owner_nickname || '닉네임 없음' }}</span>
                  <!-- 최근 댓글 활동일이 필요하면 post.last_activity를 별도 필드로 표시한다. -->
                  <span class="date">{{ formatPostDate(post.created_at) }}</span>
                </p>
                <p class="sub-text">
                  <span class="speech">댓글 {{ post.comment_count }}개</span>
                </p>
              </div>
              <button
                v-if="activeTab === 'mine'"
                type="button"
                class="exch-delete"
                aria-label="교환일기 삭제"
                @click.stop="handleDelete($event, post.id)"
              ></button>
            </li>
          </ul>

          <p class="btn-write">
            <button  @click="$router.push('/exchange/write')">쓰기</button>
          </p>
        </section>




        <!-- 비밀번호 입장 모달 -->
        <div v-if="joinPost" class="exch-pw-overlay" @click.self="joinPost = null">
          <div class="exch-pw-modal">
            <strong class="exch-pw-title">{{ joinPost.title }}</strong>
            <template v-if="inviteToken">
              <p class="exch-pw-desc">비밀번호를 입력해 주세요</p>
              <div class="exch-pw-wrap">
                <input
                  v-model="joinPw"
                  class="exch-pw-input"
                  :type="showJoinPw ? 'text' : 'password'"
                  placeholder="비밀번호"
                  autofocus
                  @keydown.enter="handleJoin"
                />
                <button type="button" class="exch-pw-eye" @click="showJoinPw = !showJoinPw">
                  <svg v-if="showJoinPw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <button class="exch-pw-confirm" :disabled="joinLoading" @click="handleJoin">
                {{ joinLoading ? '입장 중…' : '방 입장하기' }}
              </button>
            </template>
            <p v-if="joinError" class="exch-pw-error">{{ joinError }}</p>
            <button class="exch-pw-close" @click="joinPost = null">닫기</button>
          </div>
        </div>

      </main>
    </template>
  </PageLayout>
</template>
