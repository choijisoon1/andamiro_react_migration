import { Link } from 'react-router-dom'

const TITLES = {
  '/main': '메인',
  '/chat': '채팅',
  '/chat/emotion': '감정 선택',
  '/chat/result': '분석 결과',
  '/advice': '오늘의 조언',
  '/report': '리포트',
  '/exchange': '교환일기',
  '/exchange/write': '교환일기 작성',
  '/exchange/join': '교환일기 참여',
  '/exchange/room': '교환일기 방',
  '/my': '마이페이지',
  '/my/databack': '데이터 백업',
  '/my/chat-view': '일기 분석',
}

function MigrationPlaceholder({ path }) {
  return (
    <div className="migration-placeholder">
      <img src="/assets/img/main/logo.svg" alt="안다미로" />
      <h1>{TITLES[path] ?? '화면'} React 이관 중</h1>
      <p>React 기본 골격과 Zustand 인증 연결까지 완료된 상태입니다.</p>
      <Link to="/">시작 화면으로 이동</Link>
    </div>
  )
}

export default MigrationPlaceholder
