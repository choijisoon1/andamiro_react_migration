import { useNavigate } from 'react-router-dom'

import FooterCtp from '@/components/layout/FooterCtp'
import { useJoinStore } from '@/stores/joinStore'
import ProfileForm from '@/views/my/ProfileForm'

function JoinStep2View() {
  const navigate = useNavigate()
  const ageGroup = useJoinStore((state) => state.ageGroup)
  const setAgeGroup = useJoinStore((state) => state.setAgeGroup)

  function next() {
    if (!ageGroup) return
    navigate('/join/3')
  }

  return (
    <div className="wrap">
      <div id="bodyWrap" className="login">
        <main>
          <section className="importance-content">
            <div className="text-content">
              <div className="text-group">
                <em>연령대를<br />알려주세요</em>
                <span>맞춤 감정 분석을 위해 필요해요</span>
              </div>
            </div>
            <ProfileForm
              ageGroup={ageGroup}
              fields={['ageGroup']}
              idPrefix="join"
              onAgeGroupChange={setAgeGroup}
            />
          </section>
        </main>

        <FooterCtp label="다음" disabled={!ageGroup} onClick={next} />
      </div>
    </div>
  )
}

export default JoinStep2View
