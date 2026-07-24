import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import LoadingSkeleton from '@/components/common/LoadingSkeleton'
import ModalBottom from '@/components/layout/ModalBottom'
import PageLayout from '@/components/layout/PageLayout'
import {
  useCreateExchangeCommentMutation,
  useDeleteExchangeCommentMutation,
  useDeleteExchangePostMutation,
  useExchangeCommentsQuery,
  useExchangeInvitationQuery,
  useExchangePostQuery,
  useSendExchangeCommentPushMutation,
} from '@/queries/exchangeQueries'
import { useAuthStore } from '@/stores/authStore'

import './DetailView.scss'

function timeAgo(dateValue) {
  if (!dateValue) return ''

  const minutes = Math.floor(
    (Date.now() - new Date(dateValue).getTime()) / 60_000,
  )
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

function DetailCopyToast({ show }) {
  const [presence, setPresence] = useState({ show, leaving: false })

  if (presence.show !== show) {
    // Vue Transition의 0.25초 페이드아웃 뒤에만 토스트를 제거한다.
    setPresence({ show, leaving: !show })
  }

  if (!show && !presence.leaving) return null

  return (
    <div
      className={`detail-toast ${show ? 'is-entering' : 'is-leaving'}`}
      onAnimationEnd={(event) => {
        if (!show && event.target === event.currentTarget) {
          setPresence({ show: false, leaving: false })
        }
      }}
    >
      복사되었습니다.
    </div>
  )
}

function DetailView() {
  const { id = '' } = useParams()
  const routeLocation = useLocation()
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const postQuery = useExchangePostQuery(id)
  const commentsQuery = useExchangeCommentsQuery(id)
  const post = postQuery.data ?? null
  const comments = commentsQuery.data ?? []
  const currentUserId = currentUser?.id ?? null
  const isOwner = Boolean(post && post.user_id === currentUserId)
  const invitationQuery = useExchangeInvitationQuery(id, isOwner)
  const invitation = invitationQuery.data ?? null
  const createComment = useCreateExchangeCommentMutation(id)
  const deleteComment = useDeleteExchangeCommentMutation(id)
  const sendCommentPush = useSendExchangeCommentPushMutation()
  const deletePost = useDeleteExchangePostMutation()
  const copyToastTimerRef = useRef(null)
  const linkCopiedTimerRef = useRef(null)
  const [commentText, setCommentText] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState(null)
  const [error, setError] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [showMoreModal, setShowMoreModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(
    Boolean(routeLocation.state?.justCreated),
  )
  const [shareUrl, setShareUrl] = useState(
    routeLocation.state?.shareUrl ?? '',
  )
  const [copyToast, setCopyToast] = useState(false)

  const myNickname = (
    profile?.nickname
    ?? currentUser?.user_metadata?.nickname
    ?? currentUser?.user_metadata?.full_name
    ?? '나'
  )
  const authorName = !post
    ? ''
    : post.user_id === currentUserId
      ? myNickname
      : (
        post.owner_nickname
        || post.nickname
        || post.author_nickname
        || post.profiles?.nickname
        || '익명'
      )
  const authorInitial = authorName?.charAt(0) || '나'
  const loading = (
    postQuery.isLoading
    || commentsQuery.isLoading
    || (isOwner && invitationQuery.isLoading)
  )

  useEffect(() => (
    () => {
      window.clearTimeout(copyToastTimerRef.current)
      window.clearTimeout(linkCopiedTimerRef.current)
    }
  ), [])

  function commentAuthorName(comment) {
    if (comment.user_id === currentUserId) return myNickname
    return (
      comment.nickname
      || comment.author_nickname
      || comment.profiles?.nickname
      || '익명'
    )
  }

  function closeShareModal() {
    setShowShareModal(false)
    navigate('/exchange', { replace: true })
  }

  function showCopyToast() {
    setCopyToast(true)
    window.clearTimeout(copyToastTimerRef.current)
    copyToastTimerRef.current = window.setTimeout(() => {
      setCopyToast(false)
      closeShareModal()
    }, 2000)
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // 클립보드 권한이 없어도 기존 공유 완료 흐름은 유지한다.
    }
    setShowShareModal(false)
    showCopyToast()
  }

  function getDetailShareUrl() {
    if (isOwner && invitation?.token) {
      return `${window.location.origin}/exchange/join?token=${invitation.token}`
    }
    return `${window.location.origin}/exchange/view/${id}`
  }

  async function shareWithFriend() {
    if (navigator.share) {
      try {
        await navigator.share({ url: shareUrl })
        closeShareModal()
        return
      } catch {
        // 공유 창을 취소하면 링크 복사 방식으로 이어진다.
      }
    }
    await copyShareLink()
  }

  function handleSharePost() {
    if (!post) return
    setShowMoreModal(false)
    setShareUrl(getDetailShareUrl())
    setShowShareModal(true)
  }

  async function handleDeletePost() {
    if (!post || !isOwner) return
    if (!window.confirm('게시글을 삭제할까요?')) return

    setShowMoreModal(false)
    try {
      await deletePost.mutateAsync(post.id)
      navigate('/exchange')
    } catch (deleteError) {
      window.alert(deleteError?.message || '게시글 삭제에 실패했어요.')
    }
  }

  async function copyInviteLink() {
    if (!invitation?.token) return
    const link = `${window.location.origin}/exchange/join?token=${invitation.token}`

    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      window.clearTimeout(linkCopiedTimerRef.current)
      linkCopiedTimerRef.current = window.setTimeout(() => {
        setLinkCopied(false)
      }, 2000)
    } catch {
      window.alert(link)
    }
  }

  async function submitComment() {
    const text = commentText.trim()
    if (!text || createComment.isPending) return

    setError('')
    try {
      await createComment.mutateAsync(text)
      setCommentText('')

      if (post) {
        sendCommentPush.mutateAsync(post.id)
          .then((result) => {
            const errors = result?.details?.errors ?? []
            if (errors.length) {
              console.warn('comment notification details', errors)
            }
          })
          .catch((pushError) => {
            console.error('comment notification failed', pushError)
          })
      }
    } catch (commentError) {
      setError(commentError?.message || '댓글 등록에 실패했어요.')
    }
  }

  async function handleDeleteComment(commentId) {
    if (!commentId || deletingCommentId !== null) return
    if (!window.confirm('댓글을 삭제할까요?')) return

    setDeletingCommentId(commentId)
    setError('')
    try {
      await deleteComment.mutateAsync(commentId)
    } catch (commentError) {
      console.error('댓글 삭제 실패', commentError)
      window.alert(commentError?.message || '댓글 삭제에 실패했어요.')
      setError(commentError?.message || '댓글 삭제에 실패했어요.')
    } finally {
      setDeletingCommentId(null)
    }
  }

  const detailFooter = (
    <>
      {error && (
        <p className="detail-error" role="alert">{error}</p>
      )}
      {!loading && post && (
        <footer className="detail-input-bar">
          <textarea
            className="detail-input"
            placeholder="댓글을 입력해 주세요"
            rows={1}
            disabled={createComment.isPending}
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter'
                && !event.shiftKey
                && !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                submitComment()
              }
            }}
          />
          <button
            type="button"
            className="detail-send"
            disabled={createComment.isPending || !commentText.trim()}
            aria-label="댓글 전송"
            onClick={submitComment}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 3v10M4 7l4-4 4 4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </footer>
      )}
    </>
  )

  return (
    <>
      <PageLayout
        title="공유일기 상세"
        bodyClass="detail-page"
        backTo="/exchange"
        mainClassName="detail-main"
        action={post ? (
          <button
            type="button"
            className="detail-more-btn"
            aria-label="더보기"
            onClick={() => setShowMoreModal(true)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="10" cy="4" r="1.5" fill="currentColor" />
              <circle cx="10" cy="10" r="1.5" fill="currentColor" />
              <circle cx="10" cy="16" r="1.5" fill="currentColor" />
            </svg>
          </button>
        ) : null}
        footer={detailFooter}
      >
        {loading ? (
          <LoadingSkeleton type="result" count={1} />
        ) : post ? (
          <>
            <section className="view-content">
              <div className="detail-post">
                {post.image_url && (
                  <img
                    src={post.image_url}
                    className="detail-post__img"
                    alt=""
                  />
                )}

                <div className="profile">
                  <p className="profile-img">{authorInitial}</p>
                  <p className="profile-text">
                    <span className="title">{authorName}</span>
                    <span className="sub-text">{timeAgo(post.created_at)}</span>
                  </p>
                </div>

                <div className="subject">
                  <h2>{post.title}</h2>
                  <p className="subject-content">{post.content}</p>
                  {isOwner && invitation?.token && (
                    <p className="button-content">
                      <button
                        type="button"
                        className="detail-invite-btn"
                        onClick={copyInviteLink}
                      >
                        {linkCopied ? '복사 완료!' : '초대 링크 복사'}
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="detail-comments">
              <div>
                <h3 className="detail-comments__heading">
                  댓글 {comments.length}
                </h3>

                {comments.length === 0 ? (
                  <div className="detail-comment-empty">
                    <p className="detail-comment-empty__text">
                      첫 댓글을 남겨보세요
                    </p>
                  </div>
                ) : (
                  <ul className="detail-comment-list">
                    {comments.map((comment) => {
                      const mine = comment.user_id === currentUserId
                      const deleting = (
                        String(deletingCommentId) === String(comment.id)
                      )
                      const name = commentAuthorName(comment)

                      return (
                        <li
                          key={comment.id}
                          className={`detail-comment-item${mine ? ' is-mine' : ''}`}
                        >
                          <div className="comment-avatar">
                            {name.charAt(0) || '익'}
                          </div>
                          <div className="comment-body">
                            <div className="comment-header">
                              <span className="comment-name">{name}</span>
                              <span className="comment-time">
                                {timeAgo(comment.created_at)}
                              </span>
                            </div>
                            <p className="comment-text">{comment.content}</p>
                            {mine ? (
                              <button
                                type="button"
                                className="comment-action"
                                disabled={deleting}
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                {deleting ? '삭제 중…' : '삭제'}
                              </button>
                            ) : (
                              <span className="comment-action">답글</span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>
          </>
        ) : (
          <div className="detail-loading">게시글을 찾을 수 없어요.</div>
        )}
      </PageLayout>

      <ModalBottom
        show={showShareModal}
        title="다른 친구와도 공유해봐요!"
        description="아래 링크를 상대방에게 공유해 주세요"
        onClose={closeShareModal}
        footer={(
          <div className="button-content--duo">
            <button
              type="button"
              className="btn-ctp--secondary"
              onClick={copyShareLink}
            >
              링크 복사
            </button>
            <button
              type="button"
              className="btn-ctp"
              onClick={shareWithFriend}
            >
              친구에게 공유
            </button>
          </div>
        )}
      >
        <div className="img-content">
          <p className="img-group ok-diary">
            <img
              src="/assets/img/com/bg-ok.png"
              style={{ maxWidth: '280px' }}
              alt=""
            />
          </p>
        </div>
      </ModalBottom>

      <ModalBottom
        show={showMoreModal}
        title={post?.title || '더보기'}
        onClose={() => setShowMoreModal(false)}
        footer={(
          <div className="detail-more-actions">
            <button
              type="button"
              className="detail-more-action detail-more-action--share"
              onClick={handleSharePost}
            >
              <span className="detail-more-action__icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 3v8M5.5 6.5 9 3l3.5 3.5M4 15h10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="detail-more-action__text">
                <strong>공유하기</strong>
                <small>초대 링크를 보내요</small>
              </span>
            </button>

            {isOwner && (
              <button
                type="button"
                className="detail-more-action detail-more-action--delete"
                onClick={handleDeletePost}
              >
                <span className="detail-more-action__icon">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 5h12M7 2.5h4M6.5 5l.4 9m4.2-9-.4 9M4.5 5.5l.4 9a1 1 0 0 0 1 .95h6.2a1 1 0 0 0 1-.95l.4-9"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="detail-more-action__text">
                  <strong>삭제하기</strong>
                  <small>게시글을 완전히 지워요</small>
                </span>
              </button>
            )}
          </div>
        )}
      />

      <DetailCopyToast show={copyToast} />
    </>
  )
}

export default DetailView
