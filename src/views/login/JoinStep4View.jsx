import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import FooterCtp from '@/components/layout/FooterCtp'
import { useAuthStore } from '@/stores/authStore'
import { useJoinStore } from '@/stores/joinStore'
import './JoinStep4View.scss'

function JoinStep4View() {
  const navigate = useNavigate()
  const nickname = useJoinStore((state) => state.nickname)
  const saveProfile = useJoinStore((state) => state.saveProfile)
  const reset = useJoinStore((state) => state.reset)
  const fetchProfile = useAuthStore((state) => state.fetchProfile)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function complete() {
    if (loading) return

    setLoading(true)
    setError('')

    try {
      await saveProfile()
      await fetchProfile()
      reset()

      const pendingId = sessionStorage.getItem('pendingJoin')
      const pendingInvite = sessionStorage.getItem('pendingInvite')

      if (pendingId) {
        sessionStorage.removeItem('pendingJoin')
        navigate(`/exchange/join?token=${encodeURIComponent(pendingId)}`)
      } else if (pendingInvite) {
        sessionStorage.removeItem('pendingInvite')
        navigate(`/exchange?invite=${encodeURIComponent(pendingInvite)}`)
      } else {
        navigate('/main')
      }
    } catch (saveError) {
      console.error('[join:saveProfile]', saveError)
      setError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="wrap">
      <div id="bodyWrap" className="login join-complete">
        <main>
          <section className="importance-content">
            <div className="text-content img-end">
              <div className="text-group">
                <em><strong>{nickname}</strong>님,<br />환영합니다!</em>
                <span>이제 감정을 기록할 준비가 됐어요</span>
              </div>
            </div>
          </section>
        </main>

        <FooterCtp
          label={loading ? '저장 중...' : '시작하기'}
          disabled={loading}
          onClick={complete}
          above={error ? <p className="join-error">{error}</p> : null}
        />
      </div>
    </div>
  )
}

export default JoinStep4View
