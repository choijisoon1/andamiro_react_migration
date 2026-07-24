# 안다미로(DAYFLOW) 개발 가이드

## 프로젝트 개요

사용자가 감정을 선택하고 AI와 대화해 개인 일기를 남기거나 다른 사용자와
교환일기를 공유하는 PWA다.

- 프런트엔드: React 19, React Router, Vite
- 클라이언트 상태: Zustand
- 서버 상태: TanStack Query
- 백엔드: Supabase Auth, Database, Storage, Edge Functions
- AI: Anthropic Claude API
- 부가 기능: ECharts, face-api.js, Service Worker, Web Push
- 배포: Vercel

Vue, Vue Router, Pinia 코드는 React 이관 완료 후 제거됐다.

## 실행 명령

```sh
npm ci
npm run dev
npm run lint:check
npm run build
```

Node.js는 `package.json`의 `engines`에 맞는 `^20.19.0 || >=22.12.0`을 사용한다.

## 주요 구조

```text
src/
├── main.jsx                 React 진입점과 QueryClientProvider
├── App.jsx                  인증 초기화, 스플래시, 알림 토스트
├── router/reactRouter.jsx   React Router와 인증·회원가입 가드
├── stores/
│   ├── authStore.js         사용자·프로필·인증 상태
│   ├── joinStore.js         회원가입 단계 입력값
│   └── chatStore.js         감정·작성 날짜·작성 중 대화
├── api/
│   ├── diaryApi.js          개인 일기 Supabase 요청
│   └── exchangeApi.js       교환일기 Supabase 요청
├── queries/
│   ├── diaryQueries.js      개인 일기 Query·mutation
│   └── exchangeQueries.js   교환일기 Query·mutation
├── components/              공통 JSX 컴포넌트와 전용 SCSS
├── views/                   라우트별 JSX 화면
├── assets/scss/             기존 디자인 토큰과 공통 스타일
└── sw.js                    Service Worker
```

## 상태관리 원칙

- 사용자·프로필, 회원가입 입력, 저장 전 채팅처럼 여러 화면에서 공유하는
  클라이언트 상태만 Zustand에 둔다.
- Supabase가 원본인 개인 일기와 교환일기는 API 모듈과 TanStack Query에서
  관리한다.
- Query 결과를 Zustand에 중복 저장하지 않는다.
- mutation 성공 후 관련 사용자 Query Key를 무효화하거나 캐시를 갱신한다.
- 모달, 탭, 입력 포커스처럼 한 화면에서만 쓰는 값은 `useState`로 둔다.

## 화면과 라우트

```text
/login
/join/1 ~ /join/4
/main
/chat/emotion
/chat
/chat/result
/advice
/report
/exchange
/exchange/write
/exchange/view/:id
/exchange/join
/my
/my/databack
/my/chat-view?id=...
```

`/my/profile`은 기존 동작을 유지하기 위해 `/my`로 redirect한다.

개인 일기는 `emotion_records`를 사용하며 리포트와 조언의 데이터가 된다.
교환일기는 별도 데이터이므로 개인 리포트와 조언에 포함하지 않는다.

## 코드 작성 규칙

- 화면과 컴포넌트는 JavaScript/JSX를 사용하며 임의로 TSX로 전환하지 않는다.
- 컴포넌트·화면 파일은 PascalCase, 변수와 함수는 camelCase를 사용한다.
- 기존 UI의 px, 여백, 색상, 이미지, radius, 애니메이션 값을 임의로 바꾸지 않는다.
- 기존 global SCSS를 우선 재사용하고 화면 전용 스타일은 JSX 옆 `.scss`에 둔다.
- 구조 변경 이유가 있는 곳에만 짧은 한글 주석을 남긴다.
- 환경변수나 비밀키를 소스와 Git에 커밋하지 않는다.

## 환경변수

`.env.example`을 기준으로 로컬 `.env.local`을 만든다.

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=
ANTHROPIC_API_KEY=
ALLOWED_ORIGIN=http://localhost:5173
VITE_VAPID_PUBLIC_KEY=
VITE_N8N_WEBHOOK_URL=
```

`ANTHROPIC_API_KEY`는 서버 전용이므로 `VITE_` 접두사를 붙이지 않는다.
현재 n8n 경로는 비활성이므로 실제 연결 전까지 `VITE_N8N_WEBHOOK_URL`은 비워둔다.

## 변경 전 확인 항목

- React Router의 보호·회원가입 가드 순서
- 개인 일기와 교환일기 테이블·Query Key 구분
- Supabase 사용자 ID를 포함한 조회·수정 권한
- 카메라·마이크·푸시 권한 거절 처리
- PWA와 Vercel `/api/chat` 환경 차이
- 모바일과 데스크톱에서 기존 UI가 동일한지 여부
