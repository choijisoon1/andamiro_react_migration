import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import AppTabBar from '@/components/layout/AppTabBar'
import ModalBottom from '@/components/layout/ModalBottom'
import PageLayout from '@/components/layout/PageLayout'
import {
  hasVapidPublicKey,
  usePushSubscription,
} from '@/composables/usePushSubscription'
import { useDiaryStatsQuery } from '@/queries/diaryQueries'
import { useMyExchangeCountQuery } from '@/queries/exchangeQueries'
import { useAuthStore } from '@/stores/authStore'
import ProfileView from '@/views/my/ProfileView'

const MENU_ITEMS = [
  { label: '데이터 백업', icon: 'backup', to: '/my/databack' },
]

function MyView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const signOut = useAuthStore((state) => state.signOut)
  const deleteAccount = useAuthStore((state) => state.deleteAccount)
  const { data: diaryStats = { total: 0, monthly: 0 } } = useDiaryStatsQuery()
  const { data: exchangeCount = 0 } = useMyExchangeCountQuery()
  const { subscribe, unsubscribe } = usePushSubscription()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [modal, setModal] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const nickname = profile?.nickname ?? user?.email?.split('@')[0] ?? '친구'
  const email = user?.email ?? ''
  const initial = nickname.charAt(0).toUpperCase()
  const avatarUrl = user?.user_metadata?.avatar_url ?? null

  function openModal(options = {}) {
    setModal(options)
    setModalOpen(true)
  }

  function closeModal() {
    const onClose = modal?.onClose
    setModalOpen(false)
    onClose?.()
  }

  function confirmModal() {
    const onConfirm = modal?.onConfirm
    setModalOpen(false)
    onConfirm?.()
  }

  useEffect(() => {
    let cancelled = false

    async function checkPushStatus() {
      if (
        !('serviceWorker' in navigator)
        || !('PushManager' in window)
        || !('Notification' in window)
      ) return

      if (Notification.permission !== 'granted') {
        if (!cancelled) setPushEnabled(false)
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (!cancelled) setPushEnabled(Boolean(subscription))
      } catch {
        if (!cancelled) setPushEnabled(false)
      }
    }

    checkPushStatus()
    return () => {
      cancelled = true
    }
  }, [])

  async function togglePush() {
    if (!user?.id) return

    if (
      !('serviceWorker' in navigator)
      || !('PushManager' in window)
      || !('Notification' in window)
    ) {
      openModal({
        icon: '🔔',
        title: '지원하지 않는 환경',
        description: '이 브라우저는 푸시 알림을 지원하지 않아요.',
      })
      return
    }

    if (pushEnabled) {
      await unsubscribe(user.id)
      setPushEnabled(false)
      openModal({
        icon: '🔔',
        title: '알림이 해제되었어요',
        description: '이제 푸시 알림을 받지 않아요.',
      })
      return
    }

    if (!hasVapidPublicKey()) {
      openModal({
        icon: '🔔',
        title: '푸시 설정이 필요해요',
        description: 'VITE_VAPID_PUBLIC_KEY가 설정되지 않았어요. 관리자에게 문의해 주세요.',
      })
      return
    }

    if (Notification.permission === 'denied') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOS = /iPhone|iPad/i.test(navigator.userAgent)
      const description = isStandalone
        ? isIOS
          ? 'iOS 설정 앱 → 안다미로 → 알림 → 허용으로 바꾼 뒤 앱을 다시 열어주세요.'
          : '홈 화면 앱 아이콘을 길게 누르기 → 앱 정보 → 권한 → 알림 → 허용으로 바꾼 뒤 앱을 다시 열어주세요.'
        : '주소창 옆 🔒 아이콘 → 사이트 설정 → 알림 → 허용으로 바꾼 뒤 다시 시도해 주세요.'

      openModal({
        icon: '🔔',
        title: '알림이 차단되어 있어요',
        description,
      })
      return
    }

    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission

    if (permission !== 'granted') {
      openModal({
        icon: '🔔',
        title: '알림 권한이 필요해요',
        description: '푸시 알림을 받으려면 알림 권한을 허용해 주세요.',
      })
      return
    }

    setPushEnabled(true)
    try {
      await subscribe(user.id)
      openModal({
        icon: '🔔',
        title: '알림이 허용되었어요',
        description: '새 알림이 오면 알려드릴게요.',
      })
    } catch (error) {
      setPushEnabled(false)
      openModal({
        icon: '🔔',
        title: '알림 설정 실패',
        description: error?.message || '알림 설정에 실패했어요.',
      })
    }
  }

  async function handleSignOut() {
    await signOut()
    // 사용자별 Query Key를 사용하지만 로그아웃 즉시 메모리의 서버 캐시도 비워 이전 계정 데이터가 남지 않게 한다.
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  function handleDeleteAccountClick() {
    if (deletingAccount) return

    openModal({
      title: '회원탈퇴 시 모든 기록이 삭제됩니다',
      description: '삭제된 기록은 복구할 수 없어요. 정말 탈퇴할까요?',
      btnLabel: '탈퇴하기',
      onConfirm: handleDeleteAccount,
    })
  }

  async function handleDeleteAccount() {
    if (deletingAccount) return

    setDeletingAccount(true)
    try {
      await deleteAccount()
      queryClient.clear()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('[account:delete]', error)
      openModal({
        icon: '⚠️',
        title: '회원탈퇴에 실패했어요',
        description: error?.message || '잠시 후 다시 시도해 주세요.',
        btnLabel: '확인',
      })
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <>
      {showProfileEditor ? (
        <ProfileView
          onClose={() => setShowProfileEditor(false)}
          openModal={openModal}
        />
      ) : (
        <PageLayout
          title="마이"
          className="my"
          hideBack
          hideRight
          mainClassName="my-page"
          footer={<AppTabBar />}
        >
          <div className="my-body">
            <section className="my-hero">
              <div className="text-content">
                <div className="text-group">
                  <p className="tit">
                    <span>안녕하세요.</span>
                    <em>안다미로 친구님 🍀</em>
                  </p>
                </div>
              </div>
            </section>

            <section className="card-content">
              <div className="card-item my-profile">
                <div className="my-profile__avatar">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="프로필"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>
                <div className="my-profile__info">
                  <strong className="my-profile__name">{nickname}</strong>
                  <span className="my-profile__email">{email}</span>
                </div>
                <button
                  type="button"
                  className="my-profile__edit"
                  onClick={() => setShowProfileEditor(true)}
                >
                  프로필 편집
                </button>
              </div>

              <div className="label-card">
                <p className="my-section__label">활동요약</p>
                <div className="card-item my-stats">
                  <ul>
                    <li>
                      <em>{diaryStats.total}</em>
                      <span>작성한 일기</span>
                    </li>
                    <li>
                      <em>{exchangeCount}</em>
                      <span>공유일기</span>
                    </li>
                    <li className="my-stats__item">
                      <em>{diaryStats.monthly}</em>
                      <span>이번 달</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="label-card">
                <div className="card-item my-list">
                  <Link to="/exchange" className="my-list__item">
                    <span className="my-list__icon my-list__icon--exchange" />
                    <span className="my-list__text">공유 일기</span>
                  </Link>
                  <button
                    type="button"
                    className="my-list__item"
                    onClick={togglePush}
                  >
                    <span className="my-list__icon my-list__icon--notice" />
                    <span className="my-list__text">푸시 알림</span>
                    <span
                      className={`my-toggle${pushEnabled ? ' my-toggle--on' : ''}`}
                    >
                      <span className="my-toggle__thumb" />
                    </span>
                  </button>
                </div>
              </div>

              <div className="label-card">
                <div className="card-item my-list">
                  {MENU_ITEMS.map((item) => (
                    <Link key={item.label} to={item.to} className="my-list__item">
                      <span
                        className={`my-list__icon my-list__icon--${item.icon}`}
                      />
                      <span className="my-list__text">{item.label}</span>
                      <span className="my-list__arrow" />
                    </Link>
                  ))}
                  <div className="my-list__item my-list__item--version">
                    <span className="my-list__icon my-list__icon--doc" />
                    <span className="my-list__text">앱 버전</span>
                    <span className="my-list__version">v0.1.0</span>
                  </div>
                </div>
              </div>

              <div className="button-content">
                <button type="button" className="text-button" onClick={handleSignOut}>
                  로그아웃
                </button>
                <span className="line" />
                <button
                  type="button"
                  className="text-button"
                  disabled={deletingAccount}
                  onClick={handleDeleteAccountClick}
                >
                  {deletingAccount ? '탈퇴 처리 중...' : '회원탈퇴'}
                </button>
              </div>
            </section>
          </div>
        </PageLayout>
      )}

      <ModalBottom
        show={modalOpen}
        icon={modal?.icon}
        title={modal?.title}
        description={modal?.description}
        cancelLabel={modal?.cancelLabel}
        confirmLabel={modal?.btnLabel ?? '확인'}
        onClose={closeModal}
        onConfirm={confirmModal}
      />
    </>
  )
}

export default MyView
