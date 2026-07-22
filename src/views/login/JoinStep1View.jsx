import { useNavigate } from 'react-router-dom'

import FooterCtp from '@/components/layout/FooterCtp'
import { useJoinStore } from '@/stores/joinStore'
import ProfileForm from '@/views/my/ProfileForm'

function JoinStep1View() {
  const navigate = useNavigate()
  const nickname = useJoinStore((state) => state.nickname)
  const setNickname = useJoinStore((state) => state.setNickname)

  function next() {
    if (!nickname.trim()) return
    navigate('/join/2')
  }

  return (
    <div className="wrap">
      <div id="bodyWrap" className="login">
        <main>
          <section className="importance-content">
            <div className="text-content">
              <div className="text-group">
                <em>닉네임을<br />입력해 주세요</em>
                <span>안다미로가 부를 이름이에요</span>
              </div>
            </div>
            <ProfileForm
              nickname={nickname}
              fields={['nickname']}
              idPrefix="join"
              onNicknameChange={setNickname}
              onNicknameSubmit={next}
            />
          </section>
        </main>

        <FooterCtp label="다음" disabled={!nickname.trim()} onClick={next} />
      </div>
    </div>
  )
}

export default JoinStep1View
