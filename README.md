# andamiro

Vue 3 + Vite 기반 감정 일기 앱입니다.

## Project Setup

```sh
npm install
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
