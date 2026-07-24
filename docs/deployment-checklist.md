# Deployment Checklist

배포 전 확인용 문서입니다. 실제 `.env` 값이나 비밀키는 이 문서에 작성하지 않습니다.

## Vercel Environment Variables

Vercel Project Settings의 Environment Variables에 아래 값을 설정합니다.

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL. Frontend and `/api/chat` auth check use this value. |
| `VITE_SUPABASE_KEY` | Yes | Supabase anon key. This is the variable name used by the current code. |
| `ANTHROPIC_API_KEY` | Yes | Server-only Claude API key. Do not add a `VITE_` prefix. |
| `ALLOWED_ORIGIN` | Yes | Deployed app origin, for example `https://example.com`. |
| `VITE_VAPID_PUBLIC_KEY` | Optional | Required only when push notifications are enabled. |
| `VITE_N8N_WEBHOOK_URL` | No | Currently unused. Keep this empty until n8n is intentionally enabled. |

Do not put `SUPABASE_SERVICE_ROLE_KEY` in frontend or Vercel public environment variables.

## Supabase Migration and Edge Functions

프런트엔드를 배포하기 전에 Supabase CLI 또는 Dashboard의 승인된 배포 절차로
저장소의 migration과 Edge Function을 운영 프로젝트에 반영합니다.

- [ ] `supabase/migrations/202607240001_protect_exchange_password.sql` 적용
- [ ] `create-exchange-room` 배포
- [ ] `list-exchange-posts` 배포
- [ ] `get-exchange-invitation-preview` 배포
- [ ] `accept-exchange-invitation` 배포
- [ ] 일반 로그인 사용자가 `exchange_posts.password`를 직접 조회할 수 없는지 확인
- [ ] 비로그인 사용자의 초대 미리보기 함수 직접 호출이 401로 거부되는지 확인
- [ ] 초대 미리보기 응답에 `content`, `image_url`, `user_id`가 포함되지 않는지 확인
- [ ] 방 소유자가 초대 정보를 보고 상대방이 비밀번호로 입장할 수 있는지 확인

비밀번호 컬럼 보호 migration을 적용하지 않은 채 프런트엔드만 배포하면 직접
Supabase REST 요청을 통한 컬럼 조회 위험이 남을 수 있습니다.

### Optional Edge Function Secrets

| Variable | Required | Notes |
| --- | --- | --- |
| `ROOM_CREATED_WORKFLOW_URL` | No | 방 생성 이벤트를 외부 자동화로 보낼 때만 승인된 HTTPS 주소를 설정합니다. |

외부 자동화를 사용하지 않으면 `ROOM_CREATED_WORKFLOW_URL`을 설정하지 않습니다.
현재 코드는 값이 없을 때 외부 HTTP 요청과 `exchange_room_events` 생성을
건너뛰고 공유일기 방과 초대 링크만 생성합니다.

- [ ] 환경변수가 없는 상태에서 공유일기 방 생성이 정상 완료되는지 확인
- [ ] 환경변수가 없는 상태에서 외부 워크플로 요청이 발생하지 않는지 확인
- [ ] 자동화를 사용할 때만 승인된 HTTPS 주소를 Supabase Function secret으로 설정

## Supabase Auth Redirect URLs

In Supabase Dashboard, check Auth URL configuration.

Add the local and deployed app origins that can receive OAuth redirects:

- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:4173`
- Production Vercel domain
- Custom production domain, if used
- Vercel preview domain, if preview OAuth testing is required

The app builds OAuth `redirectTo` from `window.location.origin`, optionally with pending invite query parameters.

## Google OAuth Console

In Google Cloud Console, check the OAuth client used by Supabase Google login.

Authorized redirect URI should include the Supabase auth callback URL:

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
```

Do not put the Vercel app URL here unless Google/Supabase documentation for the configured provider specifically requires it. The app redirects through Supabase Auth.

## Post-Deploy Test Order

- [ ] Open `/` and confirm splash redirects correctly.
- [ ] Log in with Google as an existing user.
- [ ] Log out and confirm `/login` appears.
- [ ] Log in with a new Google account and confirm `/join/1` starts.
- [ ] Complete `/join/1` through `/join/4`.
- [ ] Confirm the new user reaches `/main`.
- [ ] Visit protected routes while logged out and confirm redirect to `/login`.
- [ ] Open `/chat/emotion`, select an emotion, and start chat.
- [ ] Send a text message and confirm `/api/chat` returns a response.
- [ ] Attach an image in chat and confirm AI response.
- [ ] Finish the diary and confirm `/chat/result` analysis appears.
- [ ] Save the diary and confirm the record appears on `/main`.
- [ ] In the `Asia/Seoul` time zone, confirm the saved `record_date` matches the user's local calendar date.
- [ ] Open `/advice` and confirm today's advice screen works.
- [ ] Confirm `/advice` reads the same local-date record that was saved from `/chat/result`.
- [ ] Open `/report` and confirm report data renders.
- [ ] Create an exchange diary in `/exchange/write`.
- [ ] Open the exchange diary detail page.
- [ ] Copy or share an invitation link.
- [ ] Open the invitation link in a logged-out browser and confirm login flow.
- [ ] Enter the exchange diary password and confirm room entry.
- [ ] Open `/my` and confirm profile, stats, and logout.

## `/api/chat` Failure Logs

Use these locations when Claude chat, analysis, or advice fails.

| Symptom | Check |
| --- | --- |
| Build succeeds but AI fails in production | Vercel Dashboard -> Functions Logs -> `/api/chat` |
| `401 Unauthorized` | Browser Network tab, Authorization header, Supabase Auth logs |
| `500 Server API key not configured` | Vercel `ANTHROPIC_API_KEY` environment variable |
| CORS error | `ALLOWED_ORIGIN` value in Vercel |
| Invalid request body | Browser Network tab request payload |
| Anthropic upstream error | Vercel Function Logs and Anthropic account status |

Development and production handle `/api/chat` differently:

- Development: `vite.config.js` proxy forwards `/api/chat` directly to Anthropic.
- Production: Vercel `api/chat.js` verifies Supabase token first, then calls Anthropic.

## PWA / Service Worker Checks

After deployment, use Chrome DevTools -> Application.

- [ ] Manifest is detected.
- [ ] App name and icons load from `/assets/img/pwa/...`.
- [ ] Service worker `sw.js` is registered.
- [ ] Service worker reaches activated/running state.
- [ ] Cache Storage contains precache entries.
- [ ] Reload after deployment serves the latest app version.
- [ ] Install prompt appears where supported.
- [ ] Push notification subscription works only after VAPID settings are configured.

Known deferred warning:

- `inlineDynamicImports option is deprecated, please use codeSplitting: false instead.`
- This currently comes from the PWA/service worker build path and is deferred because changing it can affect service worker behavior.

## Do Not Do

- Do not commit real `.env` values or secrets.
- Do not prefix `ANTHROPIC_API_KEY` with `VITE_`.
- Do not put `SUPABASE_SERVICE_ROLE_KEY` in frontend or Vercel public env.
- Do not add a hardcoded fallback URL for `ROOM_CREATED_WORKFLOW_URL`.
- Do not set `VITE_N8N_WEBHOOK_URL` until n8n is intentionally enabled.
- Do not remove Supabase token verification from `api/chat.js`.
- Do not change OAuth redirect URLs immediately before deploy without retesting login.
- Do not change service worker or PWA settings immediately before deploy without install/update testing.
- Do not change `vercel.json` rewrites unless `/api/*` and SPA routing are retested.
