<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import ModalBottom from '@/components/layout/modalBottom.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { useExchangeStore } from '@/stores/exchange'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const exchange = useExchangeStore()
const auth = useAuthStore()

const post = ref(null)
const commentText = ref('')
const sending = ref(false)
const loading = ref(true)
const deletingCommentId = ref(null)
const error = ref('')
const invitation = ref(null)
const linkCopied = ref(false)
const showMoreModal = ref(false)
const showShareModal = ref(false)
const shareUrl = ref('')
const copyToast = ref(false)
let copyToastTimer = null

const myId = computed(() => auth.user?.id ?? null)
const myNickname = computed(
  () =>
    auth.profile?.nickname ??
    auth.user?.user_metadata?.nickname ??
    auth.user?.user_metadata?.full_name ??
    '나'
)

const authorName = computed(() => {
  if (!post.value) return ''
  if (post.value.user_id === myId.value) return myNickname.value
  return (
    post.value.owner_nickname ||
    post.value.nickname ||
    post.value.author_nickname ||
    post.value.profiles?.nickname ||
    '익명'
  )
})

const authorInitial = computed(() => authorName.value?.charAt(0) || '나')
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

function commentAuthorName(c) {
  if (c.user_id === myId.value) return myNickname.value
  return c.nickname || c.author_nickname || c.profiles?.nickname || '익명'
}

function commentInitial(c) {
  return commentAuthorName(c).charAt(0) || '익'
}

async function loadDetail() {
  const id = route.params.id
  loading.value = true
  error.value = ''
  post.value = null
  invitation.value = null

  try {
    const data = await exchange.getById(id)
    post.value = data
    if (data?.user_id === myId.value) {
      try {
        invitation.value = await exchange.getInvitation(id)
      } catch {
        invitation.value = null
      }
    }
    if (data) {
      try {
        await exchange.fetchComments(id)
      } catch {
        /* 댓글 로딩 실패는 본문 표시를 막지 않음 */
      }
    }
  } catch {
    post.value = null
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, loadDetail, { immediate: true })

onMounted(() => {
  if (history.state?.justCreated) {
    shareUrl.value = history.state.shareUrl ?? ''
    showShareModal.value = true
  }
})

function showCopyToast() {
  copyToast.value = true
  clearTimeout(copyToastTimer)
  copyToastTimer = setTimeout(() => {
    copyToast.value = false
    closeShareModal()
  }, 2000)
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
  } catch {
    /* ignore */
  }
  showShareModal.value = false
  showCopyToast()
}

function closeShareModal() {
  showShareModal.value = false
  router.replace('/exchange')
}

function closeMoreModal() {
  showMoreModal.value = false
}

function getDetailShareUrl() {
  if (post.value?.user_id === myId.value && invitation.value?.token) {
    return `${location.origin}/exchange/join?token=${invitation.value.token}`
  }
  return `${location.origin}/exchange/view/${route.params.id}`
}

async function shareWithFriend() {
  if (navigator.share) {
    try {
      await navigator.share({ url: shareUrl.value })
      closeShareModal()
      return
    } catch {
      /* 사용자가 취소한 경우 무시 */
    }
  }
  await copyShareLink()
}

async function handleSharePost() {
  if (!post.value) return
  closeMoreModal()
  shareUrl.value = getDetailShareUrl()
  showShareModal.value = true
}

async function handleDeletePost() {
  if (!post.value) return
  if (post.value.user_id !== myId.value) return
  if (!confirm('게시글을 삭제할까요?')) return

  closeMoreModal()

  try {
    await exchange.deletePost(post.value.id)
    router.push('/exchange')
  } catch (e) {
    alert(e?.message || '게시글 삭제에 실패했어요.')
  }
}

async function copyInviteLink() {
  if (!invitation.value?.token) return
  const link = `${location.origin}/exchange/join?token=${invitation.value.token}`
  try {
    await navigator.clipboard.writeText(link)
    linkCopied.value = true
    setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch {
    alert(link)
  }
}

async function submitComment() {
  const text = commentText.value.trim()
  if (!text || sending.value) return
  sending.value = true
  error.value = ''
  try {
    await exchange.addComment(route.params.id, text)
    commentText.value = ''
    if (post.value) {
      exchange
        .sendCommentPush(post.value.id)
        .then((result) => {
          const errors = result?.details?.errors ?? []
          if (errors.length) console.warn('comment notification details', errors)
        })
        .catch((err) => {
          console.error('comment notification failed', err)
        })
    }
  } catch (e) {
    error.value = e?.message || '댓글 등록에 실패했어요.'
  } finally {
    sending.value = false
  }
}

async function handleDeleteComment(commentId) {
  if (!commentId || deletingCommentId.value) return
  if (!confirm('댓글을 삭제할까요?')) return

  deletingCommentId.value = commentId
  error.value = ''

  try {
    await exchange.deleteComment(commentId)
    try {
      await exchange.fetchComments(route.params.id)
    } catch (fetchErr) {
      console.error('댓글 목록 갱신 실패', fetchErr)
      error.value = '댓글은 삭제됐지만 목록 갱신에 실패했어요.'
    }
  } catch (e) {
    console.error('댓글 삭제 실패', e)
    alert(e?.message || '댓글 삭제에 실패했어요.')
    error.value = e?.message || '댓글 삭제에 실패했어요.'
  } finally {
    deletingCommentId.value = null
  }
}
</script>

<template>
  <PageLayout title="공유일기 상세" bodyClass="detail-page" back-to="/exchange">
    <template #action>
      <button
        v-if="post"
        type="button"
        class="detail-more-btn"
        aria-label="더보기"
        @click="showMoreModal = true"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="4" r="1.5" fill="currentColor" />
          <circle cx="10" cy="10" r="1.5" fill="currentColor" />
          <circle cx="10" cy="16" r="1.5" fill="currentColor" />
        </svg>
      </button>
    </template>
    <template #body>
      <main class="detail-main">
        <LoadingSkeleton v-if="loading" type="result" :count="1" />

        <template v-else-if="post">
          <section class="view-content">
            <div class="detail-post">
              <img v-if="post.image_url" :src="post.image_url" class="detail-post__img" alt="" />

              <div class="profile">
                <p class="profile-img">{{ authorInitial }}</p>
                <p class="profile-text">
                  <span class="title">{{ authorName }}</span>
                  <span class="sub-text">{{ timeAgo(post.created_at) }}</span>
                </p>
              </div>

              <div class="subject">
                <h2>{{ post.title }}</h2>
                <p class="subject-content">{{ post.content }}</p>
                <p v-if="post.user_id === myId && invitation?.token" class="button-content">
                  <button type="button" class="detail-invite-btn" @click="copyInviteLink">
                    {{ linkCopied ? '복사 완료!' : '초대 링크 복사' }}
                  </button>
                </p>
              </div>
            </div>
          </section>

          <section class="detail-comments">
            <div>
              <h3 class="detail-comments__heading">댓글 {{ exchange.comments.length }}</h3>

              <div v-if="exchange.comments.length === 0" class="detail-comment-empty">
                <p class="detail-comment-empty__text">첫 댓글을 남겨보세요</p>
              </div>

              <ul v-else class="detail-comment-list">
                <li
                  v-for="c in exchange.comments"
                  :key="c.id"
                  class="detail-comment-item"
                  :class="{ 'is-mine': c.user_id === myId }"
                >
                  <div class="comment-avatar">{{ commentInitial(c) }}</div>
                  <div class="comment-body">
                    <div class="comment-header">
                      <span class="comment-name">{{ commentAuthorName(c) }}</span>
                      <span class="comment-time">{{ timeAgo(c.created_at) }}</span>
                    </div>
                    <p class="comment-text">{{ c.content }}</p>
                    <button
                      v-if="c.user_id === myId"
                      type="button"
                      class="comment-action"
                      :disabled="String(deletingCommentId) === String(c.id)"
                      @click.stop="handleDeleteComment(c.id)"
                    >
                      {{ String(deletingCommentId) === String(c.id) ? '삭제 중…' : '삭제' }}
                    </button>
                    <span v-else class="comment-action">답글</span>
                  </div>
                </li>
              </ul>
            </div>
          </section>
        </template>

        <div v-else class="detail-loading">게시글을 찾을 수 없어요.</div>
      </main>

      <p v-if="error" class="detail-error" role="alert">{{ error }}</p>

      <footer v-if="!loading && post" class="detail-input-bar">
        <textarea
          v-model="commentText"
          class="detail-input"
          placeholder="댓글을 입력해 주세요"
          rows="1"
          :disabled="sending"
          @keydown.enter.prevent="submitComment"
        />
        <button
          type="button"
          class="detail-send"
          :disabled="sending || !commentText.trim()"
          aria-label="댓글 전송"
          @click="submitComment"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M4 7l4-4 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </footer>
    </template>
  </PageLayout>

  <ModalBottom
    :show="showShareModal"
    title="다른 친구와도 공유해봐요!"
    description="아래 링크를 상대방에게 공유해 주세요"
    @close="closeShareModal"
  >
    <div class="img-content">
      <p class="img-group ok-diary"><img src="/assets/img/com/bg-ok.png" style="max-width:280px" alt=""></p>
    </div>
    <template #footer>
      <div class="button-content--duo">
        <button class="btn-ctp--secondary" @click="copyShareLink">링크 복사</button>
        <button class="btn-ctp" @click="shareWithFriend">친구에게 공유</button>
      </div>
    </template>
  </ModalBottom>

  <ModalBottom
    :show="showMoreModal"
    :title="post?.title || '더보기'"
    @close="closeMoreModal"
  >
    <template #footer>
      <div class="detail-more-actions">
        <button type="button" class="detail-more-action detail-more-action--share" @click="handleSharePost">
          <span class="detail-more-action__icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 3v8M5.5 6.5 9 3l3.5 3.5M4 15h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span class="detail-more-action__text">
            <strong>공유하기</strong>
            <small>초대 링크를 보내요</small>
          </span>
        </button>

        <button
          v-if="post?.user_id === myId"
          type="button"
          class="detail-more-action detail-more-action--delete"
          @click="handleDeletePost"
        >
          <span class="detail-more-action__icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 5h12M7 2.5h4M6.5 5l.4 9m4.2-9-.4 9M4.5 5.5l.4 9a1 1 0 0 0 1 .95h6.2a1 1 0 0 0 1-.95l.4-9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span class="detail-more-action__text">
            <strong>삭제하기</strong>
            <small>게시글을 완전히 지워요</small>
          </span>
        </button>
      </div>
    </template>
  </ModalBottom>

  <Transition name="toast">
    <div v-if="copyToast" class="detail-toast">복사되었습니다.</div>
  </Transition>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

.detail-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 0;
  padding-bottom: 12px;
}

.detail-main > .loading-skeleton {
  padding: 0 24px;
}

.detail-more-btn {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: $title;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.detail-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: $text-disabled;
  font-size: $font14;
}

.view-content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.detail-post {
  padding:0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-post__img {
  width: 100%;
  max-height: 280px !important;
  object-fit: contain !important;
  background: $white;
}

.profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 4px;

  .profile-img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: $primary;
    color: $white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: $font-b;
    flex-shrink: 0;
  }

  .profile-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    .title {
      color: $title;
      font-weight: $font-b;
    }

    .sub-text {
      color: $text-disabled;
      font-size: $font12;
    }
  }
}

.subject {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 20px;

  h2 {
    display: block;
    color: $title;
    font-weight: $font-b;
    font-size: $font20;
    line-height: 1.4;
  }

  .subject-content {
    color: $text-default;
    line-height: 1.75;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .button-content {
    text-align: right;

    .detail-invite-btn {
      width: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      background: $white;
      border-radius: 20px;
      color: $primary;
      border: 1px solid $border;
      font-size: $font12;
      font-weight: $font-sb;
    }
  }
}

.detail-comments {
  > div {
    padding: 12px 0 0;
    border-top: 1px solid $border;
  }
}

.detail-comments__heading {
  color: $text-disabled;
  font-weight: $font-l;
  font-size: $font14;
}

.detail-comment-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 18px 0 12px;
  color: $text-disabled;
}

.detail-comment-empty__count {
  color: $title;
  font-size: $font14;
  font-weight: $font-sb;
}

.detail-comment-empty__divider {
  width: 100%;
  height: 1px;
  background: $border;
}

.detail-comment-empty__text {
  font-size: $font14;
}

.detail-comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-comment-item {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);

  &.is-mine {
    .comment-avatar {
      background: #c0c0c0;
    }
  }
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: $primary;
  color: $white;
  font-size: $font14;
  font-weight: $font-b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.comment-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.comment-name {
  font-size: $font14;
  font-weight: $font-b;
  color: $title;
}

.comment-time {
  font-size: $font12;
  color: $text-sub;
}

.comment-text {
  font-size: $font14;
  color: $text-default;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-action {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  color: $text-disabled;
  align-self: flex-start
  ;
}

.comment-action:disabled {
  opacity: 0.5;
  cursor: default;
}

.detail-error {
  padding: 0 24px 8px;
  color: #c62828;
  font-size: $font13;
}

.detail-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid $border;
  background: $white;
  position:relative;
}

.detail-input {
  flex: 1;
  min-height: 50px;
  max-height: 110px;
  padding: 10px 14px;
  border-radius: 30px;
  resize: none;
  line-height: 1.5;
  color: $title;
  background: #F5F6F8;
  border:0;

  &::placeholder {
    color: $text-disabled;
  }

  &:focus {
    border-color: $primary;
  }
}

.detail-send {
    position: absolute;
    top: 17px;
    right: 22px;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: $primary;
    color: $white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    z-index:2;

    &:disabled {
      background: #E0E0E0;
      color: $text-disabled;
    }

    svg {
      display: block;
    }
  }

.detail-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: $white;
  font-size: $font14;
  padding: 10px 20px;
  border-radius: 100px;
  white-space: nowrap;
  z-index: 2000;
  pointer-events: none;
}

.detail-more-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.detail-more-action {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 20px;
  border: 1px solid $border;
  background: #f7f9fc;
  text-align: left;

  &__icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 3px;

    strong {
      font-size: $font14;
      font-weight: $font-sb;
      color: $title;
    }

    small {
      font-size: $font12;
      color: $text-disabled;
    }
  }

  &--share {
    background: #f2f6ff;
    border-color: #d7e3ff;

    .detail-more-action__icon {
      background: #e7efff;
      color: $primary;
    }
  }

  &--delete {
    background: #fff2f2;
    border-color: #ffd0d0;

    .detail-more-action__icon {
      background: #ffe2e2;
      color: #d64545;
    }

    strong,
    small {
      color: #d64545;
    }
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
