const ALLOWED_NOTIFICATION_PATHS = [
  /^\/main\/?$/,
  /^\/advice\/?$/,
  /^\/report\/?$/,
  /^\/exchange\/?$/,
  /^\/exchange\/view\/[^/]+\/?$/,
  /^\/my\/?$/,
]

// 푸시 payload가 외부 주소나 의도하지 않은 내부 경로로 이동시키지 못하게 제한한다.
export function safeNotificationTarget(value, fallback = '') {
  if (!value || typeof value !== 'string') return fallback

  try {
    const origin = globalThis.location?.origin
    if (!origin) return fallback

    const url = new URL(value, origin)
    const allowed = url.origin === origin
      && ALLOWED_NOTIFICATION_PATHS.some((pattern) => pattern.test(url.pathname))

    return allowed ? `${url.pathname}${url.search}${url.hash}` : fallback
  } catch {
    return fallback
  }
}
