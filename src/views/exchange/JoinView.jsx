import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  useAcceptExchangeInvitationMutation,
  useExchangeInvitationPreviewQuery,
} from '@/queries/exchangeQueries'
import { useAuthStore } from '@/stores/authStore'

import './JoinView.scss'

function JoinView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)
  const inviteToken = searchParams.get('token') || searchParams.get('id') || ''
  const invitationQuery = useExchangeInvitationPreviewQuery(inviteToken)
  const acceptInvitation = useAcceptExchangeInvitationMutation()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isWebView] = useState(() => {
    const userAgent = navigator.userAgent
    return /KAKAOTALK|NAVER|Instagram|FB_IAB|FBAN/i.test(userAgent)
      || (/Android/.test(userAgent) && /; wv\)/.test(userAgent))
  })

  const post = invitationQuery.data?.post ?? null
  const invitationError = !inviteToken
    ? '유효하지 않은 초대 링크예요.'
    : user && invitationQuery.isSuccess && !post
      ? '존재하지 않는 초대예요.'
      : ''
  const displayError = error || invitationError

  useEffect(() => {
    if (!inviteToken) return
    // OAuth 복귀 후 같은 초대가 반복 실행되지 않도록 소비한 토큰을 정리한다.
    if (sessionStorage.getItem('pendingJoin') === inviteToken) {
      sessionStorage.removeItem('pendingJoin')
    }
  }, [inviteToken])

  async function loginWithGoogle() {
    try {
      setError('')
      // 첫 번째 인자는 OAuth 복귀 주소의 pendingJoin으로 전달된다.
      await signInWithGoogle(inviteToken || null)
    } catch {
      setError('로그인에 실패했어요. 다시 시도해 주세요.')
    }
  }

  async function join() {
    if (!post || acceptInvitation.isPending) return

    setError('')
    try {
      const postId = await acceptInvitation.mutateAsync({
        token: inviteToken,
        password: password.trim(),
      })

      if (postId === false) {
        setError('비밀번호가 틀렸어요.')
        return
      }
      if (!postId) {
        setError('존재하지 않는 초대예요.')
        return
      }

      navigate(`/exchange/view/${postId}`, { replace: true })
    } catch (joinError) {
      setError(joinError?.message || '입장 중 오류가 발생했어요.')
    }
  }

  if (!user) {
    return (
      <div className="wrap join-invite-login">
        <div id="bodyWrap" className="login">
          <main>
            <section className="importance-content">
              <div className="text-content join-hero-content">
                <img
                  src="/assets/img/main/img-splash.gif"
                  alt="안다미로"
                  className="join-hero__img"
                />
              </div>
              {isWebView && (
                <div className="join-webview-warn">
                  <p className="join-webview-warn__title">
                    ⚠️ 구글 로그인이 지원되지 않아요
                  </p>
                  <p className="join-webview-warn__desc">
                    하단 메뉴의 <strong>다른 브라우저로 열기</strong>를 눌러
                    Chrome에서 열어주세요.
                  </p>
                </div>
              )}
            </section>
          </main>

          <footer className="button-ctp">
            <div className="button-content">
              {displayError && (
                <p className="join-error" role="alert">{displayError}</p>
              )}
              <p className="join-info-btn">공유일기를 보려면 로그인해주세요</p>
              <button
                type="button"
                className="btn-line ico-google"
                disabled={isWebView}
                onClick={loginWithGoogle}
              >
                Google 로 로그인
              </button>
            </div>
          </footer>
        </div>
      </div>
    )
  }

  return (
    <div className="join-wrap">
      {post ? (
        <section className="join-pw">
          <span className="join-pw__icon" aria-hidden="true">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>

          <div className="text-content">
            <h2 className="join-pw__title">비밀번호를 입력해 주세요</h2>
            <p className="join-pw__desc">
              <em className="join-pw__post-name">&quot;{post.title}&quot;</em>
              를<br />읽으려면 비밀번호가 필요해요.
            </p>
          </div>

          <div className="join-pw__field">
            <p>
              <span className="join-pw__field-icon" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                className="join-pw__input"
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호"
                maxLength={20}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter'
                    && !event.nativeEvent.isComposing
                  ) {
                    join()
                  }
                }}
              />
            </p>
            <button
              type="button"
              className="join-pw__eye"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? (
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
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {displayError && (
            <p className="join-error" role="alert">{displayError}</p>
          )}
          <button
            type="button"
            className="join-btn"
            disabled={acceptInvitation.isPending}
            onClick={join}
          >
            {acceptInvitation.isPending ? '입장 중…' : '열람하기'}
          </button>
          <button
            type="button"
            className="join-back"
            onClick={() => navigate('/exchange', { replace: true })}
          >
            돌아가기
          </button>
        </section>
      ) : displayError ? (
        <section className="join-pw">
          <p className="join-error" role="alert">{displayError}</p>
          <button
            type="button"
            className="join-btn"
            onClick={() => navigate('/exchange', { replace: true })}
          >
            교환일기로 돌아가기
          </button>
        </section>
      ) : (
        <p className="join-loading">초대 정보를 불러오는 중…</p>
      )}
    </div>
  )
}

export default JoinView
