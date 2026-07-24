# andamiro

Vite + React로 만든 감정 일기·교환일기 PWA입니다.

기존 Vue 3 + Pinia 프로젝트의 사용자 화면 19개를 React로 이관했으며, 현재
실행 코드와 패키지는 React 전용으로 정리되어 있습니다. 이관 과정과 파일 대응은
[Vue → React 이관 완료 기록](docs/react-migration-plan.md)에서 확인할 수 있습니다.

## Tech Stack

- React 19 + React Router + Vite
- Zustand: 인증, 회원가입, 작성 중 채팅 같은 클라이언트 상태
- TanStack Query: Supabase 개인 일기·교환일기 서버 상태
- Supabase Auth, Database, Storage, Edge Functions
- ECharts, face-api.js, Vite PWA

## Project Setup

```sh
npm ci
```

Node.js는 `package.json`의 `engines` 기준으로 `^20.19.0 || >=22.12.0` 버전이 필요합니다.

### Compile and Hot-Reload for Development

```sh
npm run dev
```

기본 개발 서버 주소는 `http://localhost:5173/`입니다. 해당 포트가 사용 중이면 Vite가 다음 포트로 자동 실행합니다.

### Compile and Minify for Production

```sh
npm run build
```

### Lint

```sh
npm run lint:check
```

자동 수정을 실행할 때만 아래 명령을 사용합니다.

```sh
npm run lint:fix
```

## Environment Variables

`.env.example`을 참고해 로컬에는 `.env.local`을 만듭니다. 실제 비밀키는 저장소에 커밋하지 않습니다.

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=
ANTHROPIC_API_KEY=
ALLOWED_ORIGIN=http://localhost:5173
VITE_VAPID_PUBLIC_KEY=
VITE_N8N_WEBHOOK_URL=
```

`ANTHROPIC_API_KEY`는 서버 전용 비밀키입니다. 절대 `VITE_` 접두사를 붙이지 마세요.

`VITE_N8N_WEBHOOK_URL`은 현재 비활성 / 추후 사용 예정 값입니다. 값을 넣으면 n8n 채팅 경로가 활성화될 수 있으므로 현재는 비워둡니다.

## State Management

```text
src/stores/authStore.js, joinStore.js, chatStore.js
  → 여러 React 화면에서 공유하는 클라이언트 상태

src/api/*.js
  → Supabase 요청

src/queries/*.js
  → TanStack Query 조회·mutation·캐시 무효화
```

Supabase에서 조회한 데이터를 Zustand에 다시 복사하지 않습니다. 서버 데이터는
TanStack Query 캐시를 단일 기준으로 사용합니다.

## `/api/chat`

개발환경과 배포환경의 `/api/chat` 처리 방식이 다릅니다.

| 환경 | 처리 방식 |
| --- | --- |
| 개발환경 `npm run dev` | `vite.config.js`의 dev proxy가 `/api/chat` 요청을 Anthropic API로 직접 전달합니다. |
| 배포환경 Vercel | `api/chat.js` 서버리스 함수가 Supabase 토큰을 검증한 뒤 Anthropic API로 전달합니다. |

Vercel 배포 환경에는 최소한 아래 환경변수가 필요합니다.

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=
ANTHROPIC_API_KEY=
ALLOWED_ORIGIN=
```

`ALLOWED_ORIGIN`에는 배포된 앱의 origin을 넣습니다. 예: `https://example.com`

현재 n8n은 사용하지 않습니다. `VITE_N8N_WEBHOOK_URL`에 값을 넣으면 채팅 경로가 n8n으로 전환될 수 있으므로, n8n을 실제로 연결하기 전까지는 비워둡니다.
