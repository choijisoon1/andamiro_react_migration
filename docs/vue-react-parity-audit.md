# Vue 원본 기준 React 이관 대조 점검

> 점검일: 2026-07-24  
> 기준 브랜치: `main`  
> 기준 원칙: Vue 원본의 UI·동작·상태 의미를 유지하고, 구현 기술만 React 방식으로 교체한다.

## 1. 점검 목적

React 이관은 기존 화면을 새로 설계하는 작업이 아니다. 다음 항목은 Vue 원본을 기준으로 유지한다.

- 화면 문구와 표시 조건
- 태그 구조, class 이름, 이미지 경로
- px, 여백, 색상, radius, 애니메이션 시간과 이동값
- 버튼을 누른 뒤의 화면 이동 순서
- 입력 검증, 오류 문구, 모달과 토스트 표시 순서
- Supabase에 저장하거나 조회하는 테이블·필드·조건
- 로그인 세션, 개인 일기, 공유 일기가 서로 구분되는 기준

React에서 달라져도 되는 것은 프레임워크 구현 방식이다.

| 책임 | Vue 원본 | React 이관 |
| --- | --- | --- |
| 컴포넌트 상태 | `ref`, `reactive`, `computed` | `useState`, 계산 변수, `useMemo` |
| 생명주기 | `onMounted`, `watch` | `useEffect` |
| 전역 클라이언트 상태 | Pinia | Zustand |
| Supabase 서버 상태 | Pinia에서 조회 후 배열 보관 | API 모듈 + TanStack Query |
| 화면 이동 | Vue Router | React Router |
| Teleport·Transition | Vue `Teleport`, `Transition` | React Portal + 같은 CSS 애니메이션 |

최종 완료 시 Pinia는 제거된다. 다만 Pinia의 모든 값을 Zustand에 복사하지는 않는다. Supabase가 원본인 데이터까지 Zustand에 중복 보관하면 캐시가 서로 달라질 수 있으므로 TanStack Query가 담당한다.

```text
Pinia auth/join/chat
  → Zustand authStore/joinStore/chatStore

Pinia diary/exchange
  → diaryApi/exchangeApi
  → diaryQueries/exchangeQueries
  → TanStack Query 캐시
```

## 2. 점검한 실행 구조

- React 진입점은 `src/main.jsx`이며 `QueryClientProvider`와 React Router를 사용한다.
- React 라우터에서 실행 중인 화면은 `.vue` 파일을 import하지 않는다.
- Vue 진입점 `src/main.js`, Vue Router, Pinia 저장소와 `.vue` 파일은 아직 비교 기준으로 남아 있다.
- React 사용자 경로 19개 중 17개가 React 화면이며, 아래 2개만 임시 화면이다.
  - `/my/databack`
  - `/my/chat-view`
- `/exchange/room`은 Vue에서도 기능이 없는 임시 화면이므로 React 라우트에서 제거된 상태다.

## 3. 영역별 대조 결과

| 영역 | Vue 기준 파일 | React 파일 | 상태관리 대응 | 소스 대조 결과 |
| --- | --- | --- | --- | --- |
| 앱·인증 라우팅 | `App.vue`, `router/index.js` | `App.jsx`, `router/reactRouter.jsx` | `auth.js` → `authStore.js` | 세션 복구, 신규 사용자, OAuth 초대 복귀, 보호 라우트 순서 일치 |
| 로그인 | `LoginView.vue` | `LoginView.jsx` | Zustand auth | Google OAuth와 웹뷰 안내 흐름 일치 |
| 회원가입 1~4 | `JoinStep*View.vue` | `JoinStep*View.jsx` | `join.js` → `joinStore.js` | 입력값, 단계 이동, 프로필 생성 순서 일치 |
| 메인 달력 | `MainView.vue` | `MainView.jsx` | Query 일기 + Zustand 채팅 초안 | 날짜 선택, 미래 날짜 차단, 기존 기록/새 기록/초안 분기 일치 |
| 감정 선택 | `EmotionView.vue` | `EmotionView.jsx` | Zustand chat | 감정 순서와 선택값 일치, Vue FLIP 효과를 같은 350ms 값으로 구현 |
| AI 채팅 | `ChatView.vue` | `ChatView.jsx` | Zustand chat | 텍스트·칩·이미지·카메라·음성·뒤로가기 확인 흐름 일치 |
| 분석 결과 | `ResultView.vue` | `ResultView.jsx` | Zustand chat + Query 저장 | 분석 fallback, 점수 애니메이션, 개인 일기 저장, 공유일기 작성 이동 일치 |
| 조언 | `AdviceView.vue` | `AdviceView.jsx` | Query 개인 일기 | 오늘 개인 일기 조회, AI 보강, 포춘쿠키 순서와 시간 일치 |
| 리포트 | `ReportView.vue` | `ReportView.jsx` | Query 월별 개인 일기 | 월 필터, 점수 계산, 차트, 데이터 없음 분기 일치 |
| 공유일기 목록 | `ExchangeView.vue` | `ExchangeView.jsx` | Query exchange | 내가 공유한/공유 받은 필터, 초대 입장, 삭제 흐름 일치 |
| 공유일기 작성 | `WriteView.vue` | `WriteView.jsx` | Query mutation | 이미지 압축, GIF 보존, AI 본문 보정, 비밀번호 검증, 공유 링크 전달 일치 |
| 공유일기 상세 | `DetailView.vue` | `DetailView.jsx` | Query detail/comments | 소유자 표시, 초대 링크, 댓글·푸시·삭제·공유 흐름 일치 |
| 초대 참여 | `JoinView.vue` | `JoinView.jsx` | Zustand auth + Query invitation | 비로그인 OAuth, 웹뷰 경고, 미리보기, 비밀번호 참여 흐름 일치 |
| 마이 | `MyView.vue` | `MyView.jsx` | Zustand auth + Query 통계 | 프로필, 개인/공유 통계, 푸시, 로그아웃, 회원탈퇴 흐름 일치 |
| 프로필 편집 | `ProfileView.vue` | `ProfileView.jsx` | Zustand auth | 조회, 입력 검증, 갱신, 완료 모달 일치 |

## 4. 이번 대조에서 발견해 수정한 차이

### 메인 달력 DOM

- React의 월 표시가 `div`로 바뀌어 있었지만 Vue는 `button`이다.
- `type`, class, `aria-label`까지 Vue 구조로 복원했다.

### Vue에 없던 모달 취소 버튼

- 메인 ‘작성 중인 기록’ 모달과 마이 ‘회원탈퇴’ 모달에 React에서만 취소 버튼이 추가되어 있었다.
- Vue 원본과 같은 단일 확인 버튼 구성으로 복원했다.
- 배경 클릭과 Escape 닫기는 React 접근성 보완이며 화면 배치는 바꾸지 않는다.

### NoData 기본 문구

- React 기본 제목에 빠진 느낌표를 Vue 문구와 같게 복원했다.

### 모달과 토스트 애니메이션

- `modalBottom.vue`: opacity 0.25초, `translateY(100%)`
- `modalFull.vue`: opacity 0.25초, `translateY(20px)`
- `App.vue` 푸시 토스트: 0.3초, `translateY(-12px)`
- `DetailView.vue` 복사 토스트: opacity 0.25초

React에서 조건부 렌더링만 사용하면 닫는 즉시 DOM이 사라져 퇴장 애니메이션이 보이지 않는다. Portal/토스트 DOM을 애니메이션 종료 시점까지 유지한 뒤 제거하도록 구현했다. 수치와 방향은 Vue 값을 그대로 사용했다.

### 앱 최초 로딩 화면

React가 일반 스플래시 화면을 인증 로딩에도 재사용하고 있었지만 Vue `App.vue`의 인증 로딩 화면은 별도 구조다. React에도 `app-loading` 구조와 흰 배경, 200px 이미지를 그대로 적용했다.

## 5. 상태관리 대조 결론

현재 방향은 ‘Pinia 일부 유지’가 아니다. 최종 React 실행 구조에서 Pinia는 사용하지 않는다.

### Zustand가 담당하는 상태

- `authStore.js`: 사용자, 프로필, 인증 초기화, 로그인·로그아웃·탈퇴
- `joinStore.js`: 회원가입 단계 사이에서 유지해야 하는 입력값
- `chatStore.js`: 선택 감정, 작성 날짜, 작성 중 메시지와 본문 초안

이 값들은 React 화면 여러 곳에서 공유하지만 Supabase 조회 캐시 자체는 아니다.

### TanStack Query가 담당하는 상태

- `diaryApi.js` + `diaryQueries.js`
  - 개인 일기 월별/날짜별/상세 조회
  - 개인 일기 저장, 분석 결과 보강
  - 전체 및 이번 달 통계
- `exchangeApi.js` + `exchangeQueries.js`
  - 공유일기 목록·상세·댓글·초대·통계
  - 작성·삭제·참여 mutation
  - mutation 성공 후 관련 사용자 캐시 갱신

Vue의 Pinia 배열을 Query 캐시로 바꿨지만 Supabase 테이블, 필터, payload와 사용자에게 보이는 처리 순서는 유지했다.

## 6. 개인 일기와 공유일기 기준

- 홈에서 날짜와 감정을 골라 AI 채팅 후 저장하는 기록은 `emotion_records`의 개인 일기다.
- 리포트와 조언은 개인 일기만 사용한다.
- 공유일기 작성 화면에서 만드는 기록은 교환일기 데이터이며 리포트·조언 데이터로 합치지 않는다.

따라서 공유일기만 작성했을 때 리포트와 조언에 NoData가 표시되는 것은 Vue 원본과 같은 정상 동작이다.

## 7. 자동 검사와 수동 검사 구분

### 이번에 완료한 검사

- Vue·React 라우트와 화면 파일 대응
- React 실행 파일의 `.vue` import 여부
- Pinia 저장소와 Zustand/API/Query 책임 대응
- 화면 문구, 조건 분기, 이미지 경로, 주요 class와 전용 SCSS 수치 대조
- 인증, 개인 일기, 공유일기 저장·조회 흐름 소스 대조
- ESLint와 Oxc 정적 검사

### 로그인한 브라우저에서 계속 확인할 항목

- OAuth 로그인과 신규/기존 사용자 분기
- 실제 AI 채팅 응답, 개인 일기 저장, 당일 재조회
- 카메라·마이크 권한 허용/거절
- 포춘쿠키와 각 모달의 진입·퇴장 애니메이션
- 공유일기 작성, 초대 링크, 다른 계정 참여, 댓글 알림
- 푸시 권한 허용/거절과 PWA 설치 모드
- 회원탈퇴는 실제 계정을 삭제하므로 마지막 통합 검사에서 별도 테스트 계정으로 수행

## 8. 다음 작업

소스 대조에서 확인된 차이를 먼저 수정했으므로 다음 화면은 `DataBack.vue`를 기준으로 `/my/databack`을 React로 이관한다.

1. Vue의 개인 일기 목록 조회·선택·전체 선택 동작을 그대로 분석한다.
2. 필요한 조회·삭제 기능을 `diaryApi.js`와 `diaryQueries.js`에 추가한다.
3. 선택 체크 상태는 화면 로컬 상태로 둔다.
4. CSV 내보내기 형식과 파일명은 Vue 원본과 동일하게 유지한다.
5. `_layout.scss`, `_my.scss`를 우선 재사용하고 임의의 스타일 수치를 추가하지 않는다.
6. 이관 후 `/my/databack`을 실제 React 화면으로 연결한다.
7. 마지막 남은 `/my/chat-view`를 같은 방식으로 이관한다.

전체 파일별 변환 경로와 최종 Vue·Pinia 제거 순서는 [React 이관 현황 및 완료 계획](./react-migration-plan.md)에 계속 누적한다.
