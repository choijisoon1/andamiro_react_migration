import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import LoadingSkeleton from '@/components/common/LoadingSkeleton'
import NoData from '@/components/common/NoData'
import QueryError from '@/components/common/QueryError'
import PageLayout from '@/components/layout/PageLayout'
import TabMenu from '@/components/layout/TabMenu'
import {
  useAcceptExchangeInvitationMutation,
  useDeleteExchangePostMutation,
  useExchangeInvitationPreviewQuery,
  useExchangePostsQuery,
} from '@/queries/exchangeQueries'
import { useAuthStore } from '@/stores/authStore'

const TABS = [
  { key: 'mine', label: '내가 공유한' },
  { key: 'shared', label: '공유 받은' },
]
const EMPTY_POSTS = []

function formatPostDate(dateValue) {
  if (!dateValue) return ''

  const target = new Date(dateValue)
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffDays = Math.floor(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays <= 0) return '오늘'
  if (diffDays <= 5) return `${diffDays}일전`

  const year = target.getFullYear()
  const month = String(target.getMonth() + 1).padStart(2, '0')
  const day = String(target.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

function ExchangeView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const authLoading = useAuthStore((state) => state.loading)
  const [activeTab, setActiveTab] = useState('mine')
  const [dismissedInviteToken, setDismissedInviteToken] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [showJoinPassword, setShowJoinPassword] = useState(false)
  const [joinError, setJoinError] = useState('')
  const routeInviteToken = searchParams.get('invite') ?? ''

  const postsQuery = useExchangePostsQuery('all')
  const posts = postsQuery.data ?? EMPTY_POSTS
  const postsLoading = postsQuery.isPending
  const postsQueryFailed = postsQuery.isError && postsQuery.data === undefined
  const invitationPreview = useExchangeInvitationPreviewQuery(routeInviteToken)
  const acceptInvitation = useAcceptExchangeInvitationMutation()
  const deletePost = useDeleteExchangePostMutation()

  const filteredPosts = useMemo(() => {
    if (activeTab === 'mine') {
      return posts.filter(
        (post) => post._role === 'owner' && post.user_id === currentUserId,
      )
    }

    return posts.filter(
      (post) => post._role === 'member' && post.user_id !== currentUserId,
    )
  }, [activeTab, currentUserId, posts])

  const inviteToken = invitationPreview.data?.post ? routeInviteToken : ''
  const joinPost = invitationPreview.data?.post ?? { title: '초대 오류' }
  const previewError = invitationPreview.isError
    ? '초대 정보를 불러오지 못했어요.'
    : '유효하지 않은 초대 링크예요.'
  const showJoinModal = Boolean(
    routeInviteToken
    && !invitationPreview.isPending
    && dismissedInviteToken !== routeInviteToken,
  )

  async function handleJoin() {
    if (!inviteToken || acceptInvitation.isPending) return
    setJoinError('')

    try {
      const postId = await acceptInvitation.mutateAsync({
        token: inviteToken,
        password: joinPassword,
      })

      if (postId === false) {
        setJoinError('비밀번호가 틀렸어요.')
        return
      }

      setDismissedInviteToken(routeInviteToken)
      setJoinPassword('')
      navigate(`/exchange/view/${postId}`)
    } catch (error) {
      setJoinError(error?.message || '입장 중 오류가 발생했어요.')
    }
  }

  async function handleDelete(event, id) {
    event.stopPropagation()
    if (activeTab !== 'mine') return
    if (!window.confirm('방을 삭제하면 댓글도 모두 삭제됩니다. 삭제할까요?')) {
      return
    }

    await deletePost.mutateAsync(id)
  }

  const isLoading = authLoading || postsLoading

  return (
    <PageLayout
      title="공유일기"
      backTo="/my"
      mainClassName="list-body"
    >
      <TabMenu tabs={TABS} value={activeTab} onChange={setActiveTab} />

      <section className="list-content">
        {isLoading ? (
          <LoadingSkeleton type="exchange-list" count={3} />
        ) : postsQueryFailed ? (
          <QueryError
            title="공유일기를 불러오지 못했어요"
            onRetry={() => postsQuery.refetch()}
          />
        ) : filteredPosts.length === 0 ? (
          <NoData
            title="아직 공유한 일기가 없어요"
            description="일기를 만들고 소중한 사람에게<br/> 초대 링크를 공유해 보세요."
          />
        ) : (
          <ul>
            {filteredPosts.map((post) => (
              <li
                key={post.id}
                className="exch-item"
                onClick={() => navigate(`/exchange/view/${post.id}`)}
              >
                <p className="thumb-box">
                  {post.image_url && (
                    <img src={post.image_url} className="item__thumb" alt="" />
                  )}
                </p>
                <div className="list-box">
                  <p className="title">{post.title}</p>
                  <p className="sub-text">
                    {activeTab === 'mine' ? (
                      <span className="read">
                        {post.read_count ?? 0}명이 읽었어요
                      </span>
                    ) : (
                      <span className="n-name">
                        {post.owner_nickname || '닉네임 없음'}
                      </span>
                    )}
                    <span className="date">{formatPostDate(post.created_at)}</span>
                  </p>
                  <p className="sub-text">
                    <span className="speech">댓글 {post.comment_count}개</span>
                  </p>
                </div>
                {activeTab === 'mine' && (
                  <button
                    type="button"
                    className="exch-delete"
                    aria-label="교환일기 삭제"
                    onClick={(event) => handleDelete(event, post.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="btn-write">
          <button type="button" onClick={() => navigate('/exchange/write')}>
            쓰기
          </button>
        </p>
      </section>

      {showJoinModal && (
        <div
          className="exch-pw-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDismissedInviteToken(routeInviteToken)
            }
          }}
        >
          <div className="exch-pw-modal">
            <strong className="exch-pw-title">{joinPost.title}</strong>
            {inviteToken && (
              <>
                <p className="exch-pw-desc">비밀번호를 입력해 주세요</p>
                <div className="exch-pw-wrap">
                  <input
                    className="exch-pw-input"
                    type={showJoinPassword ? 'text' : 'password'}
                    value={joinPassword}
                    placeholder="비밀번호"
                    autoFocus
                    onChange={(event) => setJoinPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleJoin()
                    }}
                  />
                  <button
                    type="button"
                    className="exch-pw-eye"
                    onClick={() => setShowJoinPassword((visible) => !visible)}
                  >
                    {showJoinPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  className="exch-pw-confirm"
                  disabled={acceptInvitation.isPending}
                  onClick={handleJoin}
                >
                  {acceptInvitation.isPending ? '입장 중…' : '방 입장하기'}
                </button>
              </>
            )}
            {(joinError || !inviteToken) && (
              <p className="exch-pw-error">{joinError || previewError}</p>
            )}
            <button
              type="button"
              className="exch-pw-close"
              onClick={() => setDismissedInviteToken(routeInviteToken)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  )
}

export default ExchangeView
