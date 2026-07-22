import { useNavigate } from 'react-router-dom'

import FooterCtp from '@/components/layout/FooterCtp'
import { useJoinStore } from '@/stores/joinStore'
import ProfileForm from '@/views/my/ProfileForm'

function JoinStep3View() {
  const navigate = useNavigate()
  const gender = useJoinStore((state) => state.gender)
  const setGender = useJoinStore((state) => state.setGender)

  function next() {
    if (!gender) return
    navigate('/join/4')
  }

  return (
    <div className="wrap">
      <div id="bodyWrap" className="login">
        <main>
          <section className="importance-content">
            <div className="text-content">
              <div className="text-group">
                <em>성별을<br />알려주세요</em>
                <span>맞춤 감정 분석을 위해 필요해요</span>
              </div>
            </div>
            <ProfileForm
              gender={gender}
              fields={['gender']}
              idPrefix="join"
              onGenderChange={setGender}
            />
          </section>
        </main>

        <FooterCtp label="다음" disabled={!gender} onClick={next} />
      </div>
    </div>
  )
}

export default JoinStep3View
