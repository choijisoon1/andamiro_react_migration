import { useEffect, useMemo, useState } from 'react'

import FooterCtp from '@/components/layout/FooterCtp'
import PageLayout from '@/components/layout/PageLayout'
import { useAuthStore } from '@/stores/authStore'
import ProfileForm from '@/views/my/ProfileForm'

import './ProfileView.scss'

function ProfileView({ onClose, openModal }) {
  const profile = useAuthStore((state) => state.profile)
  const fetchProfile = useAuthStore((state) => state.fetchProfile)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nickname: '',
    ageGroup: '',
    gender: '',
  })

  const canSave = useMemo(() => (
    form.nickname.trim().length > 0
    && form.nickname.trim().length <= 10
    && Boolean(form.ageGroup)
    && Boolean(form.gender)
    && !saving
  ), [form, saving])

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const loadedProfile = profile ?? await fetchProfile()
        if (cancelled) return
        setForm({
          nickname: loadedProfile?.nickname ?? '',
          ageGroup: loadedProfile?.age_group ?? '',
          gender: loadedProfile?.gender ?? '',
        })
      } catch (fetchError) {
        console.error('[profile:fetch]', fetchError)
        if (!cancelled) setError('프로필 정보를 불러오지 못했어요.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [fetchProfile, profile])

  async function saveProfile() {
    if (!canSave) return

    setSaving(true)
    setError('')
    try {
      await updateProfile({
        nickname: form.nickname.trim(),
        age_group: form.ageGroup,
        gender: form.gender,
      })

      openModal?.({
        title: '프로필이 수정되었습니다',
        btnLabel: '확인',
        onConfirm: onClose,
      })
      if (!openModal) onClose?.()
    } catch (saveError) {
      console.error('[profile:update]', saveError)
      setError(saveError?.message || '프로필 저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="profile-popup"
      role="dialog"
      aria-modal="true"
      aria-label="프로필 수정"
    >
      <PageLayout
        title="프로필 수정"
        bodyClass="profile-edit-page"
        mainClassName="profile-edit-page__main"
        interceptBack
        onBack={onClose}
        footer={(
          <FooterCtp
            label={saving ? '저장 중...' : '저장'}
            disabled={loading || !canSave}
            onClick={saveProfile}
          />
        )}
      >
        {loading ? (
          <p className="profile-edit-page__status">프로필을 불러오는 중...</p>
        ) : (
          <>
            <ProfileForm
              nickname={form.nickname}
              ageGroup={form.ageGroup}
              gender={form.gender}
              showLabels
              idPrefix="profileEdit"
              onNicknameChange={(nickname) => (
                setForm((current) => ({ ...current, nickname }))
              )}
              onAgeGroupChange={(ageGroup) => (
                setForm((current) => ({ ...current, ageGroup }))
              )}
              onGenderChange={(gender) => (
                setForm((current) => ({ ...current, gender }))
              )}
            />
            {error && (
              <p className="profile-edit-page__error" role="alert">{error}</p>
            )}
          </>
        )}
      </PageLayout>
    </div>
  )
}

export default ProfileView
