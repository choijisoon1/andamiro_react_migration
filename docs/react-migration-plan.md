# Vue → React 이관 현황 및 완료 계획

> 마지막 갱신: 2026-07-24
> 대상: `C:\xampp\htdocs\andamiro_react_migration`의 `main` 브랜치

Vue 원본과 현재 React 구현을 UI·동작·상태관리 기준으로 다시 대조한 결과는
[Vue 원본 기준 React 이관 대조 점검](./vue-react-parity-audit.md)에 기록한다.

## 1. 목적과 최종 목표

이 문서는 기존 Vue 3 프로젝트를 Vite + React로 이관하는 작업의 기준 문서다. 처음 저장소를 분리한 시점부터 지금까지의 변경, 현재 실제로 동작하는 React 범위, 남은 작업, 완료 조건을 기록한다.

| 구분 | 기존 | 목표 |
| --- | --- | --- |
| UI | Vue 3 | React 19 |
| 라우터 | Vue Router | React Router |
| 상태관리 전체 | Pinia | Zustand + TanStack Query |
| 클라이언트 상태 | Pinia 저장소 | Zustand |
| Supabase 서버 상태 | Pinia 저장소에서 직접 조회·저장 | TanStack Query + API 모듈 |
| 빌드·백엔드 | Vite, Supabase, Vercel | 유지 |
| 스타일 | 기존 SCSS | 수치·이미지 경로를 유지하며 재사용 |

이관은 화면을 새로 디자인하는 작업이 아니다. 기존 px, 여백, 색상, 이미지와 애니메이션 값을 임의로 바꾸지 않고 React에서 같은 기능과 화면을 만드는 것이 우선이다.

최종적으로 Pinia는 프로젝트에서 완전히 제거한다. 다만 기존 Pinia 저장소의 모든 코드를 Zustand로만 1:1 변환하는 것이 아니라, Pinia가 담당하던 로직을 데이터 성격에 따라 Zustand와 TanStack Query로 나눠서 이관한다.

```text
기존 Pinia 상태관리
  ├─ 로그인·회원가입·작성 중 채팅 같은 클라이언트 상태 → Zustand
  └─ 일기·통계·교환일기처럼 Supabase에서 가져오는 서버 상태 → TanStack Query
```

## 2. 저장소 준비 과정

기존 Vue 저장소는 원본 보존 및 비교용으로 유지하고, 코드를 새 폴더로 복사했다.

```text
C:\xampp\htdocs\andamiro_react_migration
```

기존 `.git`, `node_modules`, `dist`, `supabase/.temp`, 실제 `.env` 파일은 복사 대상에서 제외했다. 새 폴더에서 `git init -b main`으로 별도 저장소를 만들었으므로 이관 중 문제가 생겨도 기존 Vue 저장소에는 영향을 주지 않는다.

- 개발자에게 받은 환경변수는 프로젝트 최상단 `.env.local`에 배치
- `.env.local`과 Supabase 임시 폴더는 Git에서 제외
- 이관 전 `npm ci`, `npm run dev`로 원본 프로젝트 실행 확인
- Windows에서 Sass 토큰 경로가 깨지는 문제 보정

## 3. 확정된 상태관리 원칙

### Zustand

여러 React 화면이 공유하지만 서버에서 다시 조회하는 데이터가 아닌 상태를 담당한다.

| 파일 | 역할 | 상태 |
| --- | --- | --- |
| `src/stores/authStore.js` | Supabase 인증, 사용자·프로필, 로그인·로그아웃 | 사용 중 |
| `src/stores/joinStore.js` | 회원가입 단계의 임시 입력값 | 사용 중 |
| `src/stores/chatStore.js` | 감정, 작성 중 채팅, 메시지, 기록 날짜 | 사용 중 |

향후 교환일기 작성 초안이 여러 화면에 걸쳐 유지돼야 할 때만 별도 Zustand 저장소를 추가한다.

### TanStack Query

Supabase에서 가져오며 캐시·재조회·무효화가 필요한 서버 데이터를 담당한다.

- 월별·날짜별·상세 일기
- 일기 통계
- 일기 저장 및 AI 분석 결과 갱신
- 향후 교환일기 목록·상세·초대·댓글·참여 정보

현재 일기 데이터 흐름:

```text
React 화면
  → src/queries/diaryQueries.js
    → src/api/diaryApi.js
      → Supabase
```

### React 로컬 상태

모달 열림, 포춘쿠키 애니메이션, 달력 선택 날짜, 저장 중 표시, 카메라 팝업처럼 한 화면에서만 쓰는 값은 `useState`와 `useRef`로 관리한다.

### Pinia를 아직 삭제하지 않는 이유

아직 React로 옮기지 않은 리포트·교환일기·마이 화면이 기존 Pinia 코드를 참고한다. 모든 React 화면과 API 모듈이 완성되고 회귀 검증까지 끝난 뒤 아래 기존 저장소와 Vue 의존성을 한 번에 제거한다.

```text
src/stores/auth.js
src/stores/join.js
src/stores/chat.js
src/stores/diary.js
src/stores/exchange.js
```

## 4. 처음부터 지금까지의 Git 기록

### 2026-07-22: 원본 보존과 React 기반

- `d994627` 원본 Vue 소스 전체를 새 저장소의 기준점으로 저장
- `61c0a2a` `supabase/.temp`를 `.gitignore`에 추가
- `15bfb0e` Windows Sass 경로 정규화
- `f46d695` React, React DOM, React Router, Zustand 설치
- `df0d78c` React 진입점, Router, App 셸, 인증 Zustand, 로그인 화면 추가
- `fe69d9e` 회원가입 1~4단계와 `joinStore`, 공통 폼·레이아웃 컴포넌트 이관

### 2026-07-23: 핵심 일기 흐름

- `c201f1b` TanStack Query 연결, 일기 API/Query 분리, 메인 달력과 감정 선택 이관
- `6a266a8` 채팅 입력창과 첨부 모달 구조 이관
- `d57b3e7` AI 채팅과 Web Speech API 음성 입력 이관
- `a239be8` face-api 카메라 표정 분석과 `/chat` 연결
- `2001c10` 감정 분석 결과, 게이지, Supabase 일기 저장 흐름 이관
- `4286636` 오늘의 조언, AI 데이터 보강, 빈 화면, 포춘쿠키 이관
- `b5663ca` 리포트의 요일별 에너지 차트, 감정 순위, 패턴 인사이트를 React로 이관
- `85a2a88` 교환일기 API·Query 계층과 목록·탭·로딩·빈 상태를 React로 이관

각 기능은 화면 단위로 린트·빌드 또는 브라우저 확인 후 커밋했다.

## 5. 파일별 이관 매핑

이 표는 원본 파일이 React 프로젝트의 어느 파일로 옮겨졌는지 추적하기 위한 기준이다. 하나의 Pinia 파일이 API와 Query 파일로 나뉘거나, 여러 Vue 기능이 하나의 React 셸로 합쳐진 경우도 실제 구조대로 기록한다.

### 5.1 실행 진입점과 라우터

| 기존 경로 | React 경로 | 상태·설명 |
| --- | --- | --- |
| `src/main.js` | `src/main.jsx` | React Root, QueryClientProvider, RouterProvider, PWA 등록으로 이관 완료 |
| `src/App.vue` | `src/App.jsx` | 인증 초기화, OAuth 초대 목적지 보존, Outlet, 푸시 토스트 셸로 이관 완료 |
| `src/router/index.js` | `src/router/reactRouter.jsx` | React Router와 인증·회원가입 보호 경로로 이관 중 |
| `src/views/SplashView.vue` | `src/App.jsx`의 `SplashScreen` 및 `reactRouter.jsx`의 `LandingRoute` | 스플래시와 진입 분기 기능을 합쳐서 이관 완료 |

기존 `src/router/index.js`는 미완료 Vue 화면의 원래 경로를 비교하기 위해 남아 있다. 모든 React 경로가 연결된 뒤 제거한다.

### 5.2 Pinia 저장소와 상태관리

| 기존 Pinia 경로 | 이관 경로 | 분류 | 상태 |
| --- | --- | --- | --- |
| `src/stores/auth.js` | `src/stores/authStore.js` | Zustand | 인증·사용자·프로필 이관 완료 |
| `src/stores/join.js` | `src/stores/joinStore.js` | Zustand | 회원가입 입력 상태 이관 완료 |
| `src/stores/chat.js` | `src/stores/chatStore.js` | Zustand | 감정·채팅·작성 스냅샷 이관 완료 |
| `src/stores/diary.js` | `src/api/diaryApi.js` + `src/queries/diaryQueries.js` | TanStack Query | 일기 조회·저장·통계 이관 완료 |
| `src/stores/exchange.js` | `src/api/exchangeApi.js` + `src/queries/exchangeQueries.js` | TanStack Query | 서버 로직 분리 완료, 남은 교환일기 화면에서 계속 검증 |
| `src/stores/counter.js` | 대상 없음 | 제거 예정 | 예제 저장소로 최종 정리 때 삭제 |

기존 Pinia 파일은 아직 이관하지 않은 Vue 화면과 비교하기 위해 임시로 남아 있다. 최종 실행 구조에서 사용하는 것은 위 표의 Zustand 저장소와 TanStack Query 계층이다.

### 5.3 화면 파일

| 기존 Vue 경로 | React 경로 | 관련 React 스타일 | 상태 |
| --- | --- | --- | --- |
| `src/views/login/LoginView.vue` | `src/views/login/LoginView.jsx` | `src/views/login/LoginView.scss` | 완료 |
| `src/views/login/JoinStep1View.vue` | `src/views/login/JoinStep1View.jsx` | 기존 `src/assets/scss/_login.scss` 재사용 | 완료 |
| `src/views/login/JoinStep2View.vue` | `src/views/login/JoinStep2View.jsx` | 기존 `src/assets/scss/_login.scss` 재사용 | 완료 |
| `src/views/login/JoinStep3View.vue` | `src/views/login/JoinStep3View.jsx` | 기존 `src/assets/scss/_login.scss` 재사용 | 완료 |
| `src/views/login/JoinStep4View.vue` | `src/views/login/JoinStep4View.jsx` | `src/views/login/JoinStep4View.scss` | 완료 |
| `src/views/main/MainView.vue` | `src/views/main/MainView.jsx` | 기존 `src/assets/scss/_home.scss` 재사용 | 완료 |
| `src/views/chat/EmotionView.vue` | `src/views/chat/EmotionView.jsx` | 기존 `src/assets/scss/_chat.scss` 재사용 | 완료 |
| `src/views/chat/ChatView.vue` | `src/views/chat/ChatView.jsx` | 기존 `_chat.scss` 및 `ChatComposer.scss` | 완료 |
| `src/views/chat/ResultView.vue` | `src/views/chat/ResultView.jsx` | `src/views/chat/ResultView.scss` | 완료 |
| `src/views/advice/AdviceView.vue` | `src/views/advice/AdviceView.jsx` | `src/views/advice/AdviceView.scss` | 완료 |
| `src/views/report/ReportView.vue` | `src/views/report/ReportView.jsx` | 기존 `src/assets/scss/_report.scss` 재사용 | 완료 |
| `src/views/exchange/ExchangeView.vue` | `src/views/exchange/ExchangeView.jsx` | 기존 `_layout.scss`, `_button.scss` 재사용 | 완료 |
| `src/views/exchange/WriteView.vue` | `src/views/exchange/WriteView.jsx` | `src/views/exchange/WriteView.scss` 및 기존 `_form.scss`, `_layout.scss` 재사용 | 완료 |
| `src/views/exchange/DetailView.vue` | `src/views/exchange/DetailView.jsx` | `src/views/exchange/DetailView.scss` 및 기존 `_layout.scss` 재사용 | 완료 |
| `src/views/exchange/JoinView.vue` | `src/views/exchange/JoinView.jsx` | `src/views/exchange/JoinView.scss` | 완료 |
| `src/views/exchange/RoomView.vue` | 대상 없음 | 없음 | 실제 이동 경로와 기능이 없는 임시 화면으로 확인, 최종 Vue 정리 단계에서 삭제 예정 |
| `src/views/my/MyView.vue` | `src/views/my/MyView.jsx` | 기존 `src/assets/scss/_my.scss` 재사용 | 완료 |
| `src/views/my/ProfileView.vue` | `src/views/my/ProfileView.jsx` | `src/views/my/ProfileView.scss` 및 기존 `ProfileForm.scss` 재사용 | 완료 |
| `src/views/my/DataBack.vue` | `src/views/my/DataBack.jsx` | 기존 `_layout.scss`, `_button.scss` 재사용 및 `DataBack.scss` | 완료 |
| `src/views/my/ChatViewView.vue` | `src/views/my/ChatViewView.jsx` | `src/views/my/ChatViewView.scss` 및 `SvgGauge.scss` | 완료 |
| `src/views/my/ChatListView.vue` | 대상 확인 후 제거 또는 React 작성 | 없음 | 기존 파일이 임시 화면이라 확인 필요 |

### 5.4 공통 컴포넌트

| 기존 Vue 경로·기능 | React 경로 | 상태 |
| --- | --- | --- |
| `src/components/common/FormGroup.vue` | `src/components/common/FormGroup.jsx` + `FormGroup.scss` | 완료 |
| `src/components/common/ModalButton.vue` | `src/components/common/ModalButton.jsx` | 완료 |
| `src/components/common/EmotionCameraPopup.vue` | `src/components/common/EmotionCameraPopup.jsx` + `EmotionCameraPopup.scss` | 완료 |
| `src/components/common/ResultSkeleton.vue` | `src/components/common/ResultSkeleton.jsx` + `ResultSkeleton.scss` | 완료 |
| `src/components/common/SvgGauge.vue` | `src/components/common/SvgGauge.jsx` + `SvgGauge.scss` | 완료 |
| `src/components/common/NoData.vue` | `src/components/common/NoData.jsx` + `NoData.scss` | 완료 |
| `src/components/common/LoadingSkeleton.vue` | `src/components/common/LoadingSkeleton.jsx` + `LoadingSkeleton.scss` | 완료 |
| `src/components/layout/PageLayout.vue` | `src/components/layout/PageLayout.jsx` | 완료 |
| `src/components/layout/AppTabBar.vue` | `src/components/layout/AppTabBar.jsx` + `AppTabBar.scss` | 완료 |
| `src/components/layout/FooterCtp.vue` | `src/components/layout/FooterCtp.jsx` | 완료 |
| `src/components/layout/FooterText.vue` | `src/components/layout/FooterText.jsx` | 완료 |
| `src/components/layout/ChatComposer.vue` | `src/components/layout/ChatComposer.jsx` + `ChatComposer.scss` | 완료 |
| `src/components/layout/modalBottom.vue` | `src/components/layout/ModalBottom.jsx` + `ModalBottom.scss` | 완료 |
| `src/components/layout/modalFull.vue` | `src/components/layout/ModalFull.jsx` + `ModalFull.scss` | 완료 |
| `src/components/layout/TabMenu.vue` | `src/components/layout/TabMenu.jsx` + `TabMenu.scss` | 완료 |
| `src/views/my/ProfileForm.vue` | `src/views/my/ProfileForm.jsx` + `ProfileForm.scss` | 완료, `ProfileView.jsx`에서 사용 중 |
| `vue-echarts`의 `VChart` 사용 부분 | `src/components/common/EChart.jsx`, `src/components/common/SvgGauge.jsx` | Bar Chart와 Gauge 완료 |
| `src/components/layout/FooterDouble.vue` | React 파일 예정 | 실제 사용 화면 이관 시 처리 |
| `src/components/layout/AppLayout.vue` | 대상 확인 후 제거 또는 React 작성 | 현재 실제 라우트에서 사용하지 않음 |
| `src/components/HelloWorld.vue` | 대상 없음 | 예제 파일로 최종 삭제 예정 |

### 5.5 변환하지 않고 유지하는 파일

다음 파일은 Vue 컴포넌트가 아니거나 프레임워크 의존성이 없어 React에서도 그대로 사용한다.

| 유지 경로 | 역할 |
| --- | --- |
| `src/lib/supabase.js` | Supabase Client |
| `src/composables/useAdviceEnricher.js` | AI 조언 보강 요청 |
| `src/composables/useAnalysisAgent.js` | 감정 분석 요청 |
| `src/composables/useChatAgent.js` | AI 채팅 요청 |
| `src/composables/useChatN8n.js` | 비활성 n8n 채팅 경로 |
| `src/composables/usePushSubscription.js` | 푸시 구독 로직, 마이페이지에서 연결 예정 |
| `src/sw.js` | Service Worker |
| `api/chat.js` | Vercel 서버리스 AI Proxy |
| `supabase/functions/**` | Supabase Edge Functions |
| `supabase/migrations/**` | 데이터베이스 마이그레이션 |
| `public/assets/**` | 기존 이미지·아이콘·영상 |
| `src/assets/scss/**` | 기존 공통 스타일, 화면 비교 후 최종 정리 |

앞으로 파일을 이관할 때 이 매핑표의 예정 경로를 실제 경로로 바꾸고 상태를 `완료`로 갱신한다.

## 6. 현재 React 이관 범위

실제 사용자 라우트 기준 총 19개 동작 지점이 모두 React 구현에 연결됐다. 이는 화면 코드 연결이 19/19 완료됐다는 뜻이며, 실제 계정·권한·외부 서비스까지 포함한 통합 검증과 Vue·Pinia 제거는 아직 남아 있다.

| 경로 | 기능 | 상태 |
| --- | --- | --- |
| `/` | 인증 초기화·진입 분기·스플래시 | React 완료 |
| `/login` | 로그인 | React 완료 |
| `/join/1` ~ `/join/4` | 회원가입 4단계 | React 완료 |
| `/main` | 메인 달력·일기 목록 | React 완료 |
| `/chat/emotion` | 감정 선택 | React 완료 |
| `/chat` | AI 채팅·음성·카메라 | React 완료 |
| `/chat/result` | 분석 결과·일기 저장 | React 완료 |
| `/advice` | 맞춤 조언·포춘쿠키 | React 완료 |
| `/report` | 감정 리포트 | React 완료 |
| `/exchange` | 교환일기 목록 | React 완료 |
| `/exchange/write` | 교환일기 작성·이미지 업로드·AI 요약 반영 | React 완료 |
| `/exchange/view/:id` | 교환일기 상세·댓글·공유·삭제 | React 완료 |
| `/exchange/join` | 비로그인 안내·초대 미리보기·비밀번호·참여 | React 완료 |
| `/exchange/room` | 기능 없는 Vue 임시 화면 | React 라우트 제거, 최종 정리 때 Vue 파일 삭제 |
| `/my` | 마이페이지·프로필·통계·푸시·계정 관리 | React 완료 |
| `/my/databack` | 개인 일기 선택·CSV 백업·삭제 | React 완료 |
| `/my/chat-view` | 저장된 일기 상세·감정 게이지 | React 완료 |

`/my/profile`은 기존과 동일하게 `/my`로 이동하는 redirect다.

현재 연결된 핵심 사용자 흐름:

```text
로그인
  → 신규 사용자 회원가입
  → 메인
  → 감정 선택
  → AI 채팅 / 음성 입력 / 카메라 표정 분석
  → 감정 분석 결과
  → Supabase 일기 저장
  → 메인 달력 조회
  → 오늘의 조언 / 포춘쿠키
```

React 이관 후에도 유지되는 기반:

- Supabase 인증 세션과 일기 테이블
- Anthropic `/api/chat` 및 Vercel 함수
- PWA 등록, Service Worker, 알림 토스트
- face-api 모델과 카메라 분석
- public 이미지와 기존 global SCSS

## 7. 교환일기 진행 및 남은 작업

### 교환일기 데이터 계층 (완료)

기존 `src/stores/exchange.js`에 섞여 있던 목록, 작성, 초대, 참여, 댓글, 삭제, 푸시 요청을 다음처럼 분리했다.

```text
src/api/exchangeApi.js
  - 게시물 목록·상세·작성·삭제
  - 초대 조회·재생성·참여
  - 댓글 조회·작성·삭제
  - 알림 요청

src/queries/exchangeQueries.js
  - 사용자별 Query Key
  - 목록·상세·댓글 Query
  - 작성·삭제·참여 Mutation
  - 성공 후 관련 캐시 무효화
```

화면 필터와 모달은 로컬 상태로 두고, 여러 경로에 걸쳐 유지할 작성 초안만 Zustand 후보로 둔다.

### 교환일기 화면

이관 순서:

1. `/exchange` 목록·탭·로딩·빈 상태 — 완료
2. `/exchange/write` 작성·이미지 업로드·AI 결과 전달 — 완료
3. `/exchange/view/:id` 상세·초대·댓글·삭제 — 완료
4. `/exchange/join` 초대 미리보기·비밀번호·참여 — 완료
5. `/exchange/room` 사용 여부 확인 — 미사용 임시 화면으로 확정하고 React 라우트 제거 완료

검증할 중요 기능:

- Supabase Edge Function
- 초대 코드·토큰과 URL query
- 작성자·참여자 권한
- 이미지 Storage 업로드
- 댓글 알림
- 결과 화면에서 전달한 navigation state

### 마이페이지

대상:

```text
src/views/my/MyView.vue
src/views/my/ProfileView.vue
src/views/my/DataBack.vue
src/views/my/ChatViewView.vue
```

마이 영역 기능:

- 프로필 조회·수정과 기존 `ProfileForm.jsx` 재사용
- 일기 통계와 교환일기 개수
- 푸시 알림 구독·해제
- 로그아웃과 회원 탈퇴 Edge Function
- [x] 내 기록 목록·선택·CSV 백업·삭제
- [x] 저장된 일기 상세와 감정 게이지

### 최종 정리에서 확인할 공통 컴포넌트

모든 사용자 화면 연결은 끝났다. `FooterDouble.vue`처럼 React 실행 경로에서 사용하지 않는 Vue 컴포넌트는 새로 이관하지 않고 최종 정리 단계에서 사용 여부를 다시 확인한 뒤 제거한다. 저장된 일기 상세의 Gauge는 기존 240×168 크기와 1.2초 애니메이션을 유지하는 `SvgGauge.jsx`를 재사용했다.

`RoomView.vue`는 미사용 임시 화면으로 확정했다. `HelloWorld.vue`, `counter.js`, `ChatListView.vue`처럼 예제이거나 내용이 거의 없는 나머지 파일도 마지막에 사용 여부와 요구사항을 확인하고 정리한다.

## 8. 완료까지의 권장 순서

### 단계 A — 리포트 완성 (완료)

1. Vue 화면의 계산과 차트 옵션 분석
2. React ECharts 래퍼 작성
3. `ReportView.jsx` 작성 및 `/report` 연결
4. 데이터 있음·없음 브라우저 검증
5. 린트·빌드 후 한글 커밋

완료 조건은 기존 그래프 값과 순위 계산이 같고, SCSS와 이미지 크기가 유지되며, 월별 데이터가 Query 캐시와 연결되는 것이다.

### 단계 B — 교환일기 기반과 목록 (완료)

1. `exchange.js`의 Supabase 호출을 API와 Query Hook으로 분리
2. `LoadingSkeleton`, `TabMenu` React 이관
3. 목록, 내 글 필터, 빈 상태, 로딩 상태 이관
4. 초대 query로 들어오는 진입 처리

완료 조건은 Pinia 없이 로그인 사용자별 목록을 조회하고 캐시를 분리하는 것이다.

### 단계 C — 교환일기 작성·상세·참여 (React 구현 완료, 통합 검증 예정)

1. [x] 작성 및 이미지 업로드
2. [x] 분석 결과 화면에서 전달한 AI 요약 사용
3. [x] 상세·댓글·삭제
4. [x] 초대 생성·참여
5. [ ] Edge Function과 푸시 흐름 검증

초대코드 재생성 함수는 기존 Pinia에도 있었지만 실제 Vue 화면에서 호출되지 않는다. 최종 정리 전에 요구사항을 확인하고, 필요하지 않다면 React UI를 새로 만들지 않고 관련 미사용 함수도 함께 제거한다.

완료 조건은 작성→목록→상세, 댓글 권한, 새 브라우저의 초대 링크가 모두 정상 동작하는 것이다.

### 단계 D — 마이페이지

1. [x] 마이 메인과 프로필 수정
2. [x] 일기·교환일기 통계
3. [x] 푸시 구독 코드 이관, 지원·거부 환경 수동 검증은 최종 단계에서 수행
4. [x] 내 기록 목록·선택·CSV 백업·삭제
5. [x] 저장된 일기 상세
6. [x] 로그아웃·회원 탈퇴 코드 이관, 실제 계정 탈퇴는 최종 통합 검증에서 수행

완료 조건은 프로필 변경, 일기 상세, 푸시 지원·미지원 브라우저, 탈퇴 후 세션 정리가 정상인 것이다.

### 단계 E — Vue·Pinia 제거

모든 React 라우트의 비교 검증이 끝난 뒤에만 수행한다.

1. [x] `MigrationPlaceholder.jsx` 제거
2. 사용하지 않는 `.vue` 파일과 Vue 진입점·라우터 제거
3. 기존 Pinia 저장소 제거
4. Vue 전용 Vite·ESLint 설정 제거
5. 아래 패키지 제거

```text
vue
vue-router
pinia
vue-echarts
@vitejs/plugin-vue
eslint-plugin-vue
```

6. Vue·Pinia import가 0개인지 전체 검색
7. lockfile 갱신 후 `npm ci`부터 다시 검증

### 단계 F — 최종 회귀 검증과 배포

- 로그인, OAuth 콜백, 신규·기존 사용자 분기
- 세션 복원과 보호 라우트 직접 진입
- 일기 작성 전체 흐름과 네트워크 오류
- 카메라·마이크 권한 허용 및 거부
- 달력, 과거 일기, 조언, 리포트
- 교환일기 작성·초대·댓글·권한
- 프로필·푸시·탈퇴
- 모바일 화면과 PWA 설치 모드
- Vercel 환경변수와 `/api/chat`
- Supabase RLS와 Edge Function 권한

## 9. 스타일과 코드 작성 규칙

1. 기존 global SCSS는 가능한 그대로 재사용한다.
2. Vue의 `<style scoped>`는 같은 React 컴포넌트 옆 `.scss` 파일로 옮긴다.
3. px, rem, 간격, 색상, radius, 애니메이션 시간은 임의 변경하지 않는다.
4. `public/assets` 이미지 경로를 그대로 사용한다.
5. selector 충돌 시 시각 결과를 바꾸지 않는 범위에서만 범위를 좁힌다.
6. 데스크톱과 모바일 너비를 모두 비교한다.

컴포넌트 폴더에 새 SCSS가 생기는 이유는 새 디자인을 만들기 위해서가 아니라 Vue 파일 내부의 scoped 스타일을 React import 구조로 분리하기 위해서다.

- React 코드는 JavaScript/JSX를 사용하고 이번 범위에서 TSX로 전환하지 않는다.
- 구조를 바꾼 이유가 있는 곳에는 짧은 한글 주석을 남긴다.
- 당연한 코드를 줄마다 설명하는 주석은 피한다.
- 화면 단위로 린트·빌드·브라우저 확인 후 커밋한다.
- 커밋 메시지는 한글을 기본으로 한다.

권장 커밋 예시:

```text
기능: 리포트 화면과 감정 차트를 리액트로 이관
구조: 교환일기 서버 상태를 TanStack Query로 분리
수정: 모바일 조언 카드의 이미지 경로를 보정
정리: Vue와 Pinia 의존성을 제거
```

## 10. 현재 검증 상태와 알려진 경고

지금까지 이관된 범위는 `npm run lint`, `npm run build`와 주요 브라우저 동작 확인을 통과했다. 감정 이미지, 카메라 팝업, 분석 결과 저장, 조언의 일반·빈 화면, 포춘쿠키 상호작용도 확인했다.

빌드는 성공하지만 다음 경고는 남아 있다.

- `face-api.js`의 Node `fs` 참조에 대한 Vite 안내
- 메인 JavaScript chunk가 500kB보다 크다는 경고
- PWA의 `inlineDynamicImports` deprecation 경고

현재 실행을 막지는 않는다. 모든 화면 이관 후 route lazy loading과 PWA 설정 정리 단계에서 확인한다.

## 11. 최종 완료 체크리스트

- [x] 모든 사용자 라우트에서 `MigrationPlaceholder` 제거
- [ ] 기존 Vue와 동일한 핵심 기능 및 화면 유지
- [ ] Supabase 서버 상태를 API 모듈 + TanStack Query로 관리
- [ ] 필요한 전역 클라이언트 상태를 Zustand로 관리
- [ ] 런타임에서 `.vue`, Pinia, Vue Router를 사용하지 않음
- [ ] Vue 전용 패키지와 설정 제거
- [ ] `npm ci` 후 `npm run lint:check` 성공
- [ ] `npm run build` 성공
- [ ] 로그인부터 일기 저장·조회까지 전체 흐름 검증
- [ ] 교환일기 초대·댓글·권한 검증
- [ ] PWA·카메라·마이크·푸시의 허용/거부 흐름 검증
- [ ] Vercel·Supabase 환경변수와 배포 확인
- [ ] README와 배포 문서를 React 기준으로 갱신

## 12. 바로 다음 작업

화면 코드 연결은 19/19 완료됐다. 다음 작업은 Vue·Pinia 파일을 바로 삭제하는 것이 아니라, React 전체 흐름을 실제 브라우저에서 먼저 회귀 검증하는 것이다.

1. 메인 달력에서 저장된 일기를 열어 `id` 조회, 게이지, 지표와 채팅 요약을 확인한다.
2. 로그인→감정 선택→AI 채팅→저장→달력 재조회 흐름을 확인한다.
3. 공유일기 작성→상세→초대→댓글 흐름을 다른 테스트 계정까지 포함해 확인한다.
4. 카메라·마이크·푸시의 허용 및 거부 흐름을 확인한다.
5. 검증 결과를 반영한 뒤 Vue 진입점·라우터·Pinia 저장소와 Vue 전용 패키지를 제거한다.

`MigrationPlaceholder.jsx`와 전용 스타일은 마지막 실제 사용자 경로를 React로 연결하면서 제거했다. Vue 원본 화면은 회귀 비교 자료이므로 위 검증이 끝날 때까지 유지한다.
