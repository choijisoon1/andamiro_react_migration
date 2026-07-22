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
- [ ] Open `/advice` and confirm today's advice screen works.
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
- Do not set `VITE_N8N_WEBHOOK_URL` until n8n is intentionally enabled.
- Do not remove Supabase token verification from `api/chat.js`.
- Do not change OAuth redirect URLs immediately before deploy without retesting login.
- Do not change service worker or PWA settings immediately before deploy without install/update testing.
- Do not change `vercel.json` rewrites unless `/api/*` and SPA routing are retested.
