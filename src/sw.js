// vite-plugin-pwa 필수 참조 (프리캐싱 미사용 - 즉시 활성화 위해)
void self.__WB_MANIFEST

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(
  (async () => {
    await self.clients.claim()
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  })()
))

self.addEventListener('push', (event) => {
  if (!event.data) return
  const { title, body, url } = event.data.json()
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      allClients.forEach(c => c.postMessage({ type: 'PUSH', title, body, url }))

      if ('setAppBadge' in navigator) {
        await navigator.setAppBadge()
      }

      await self.registration.showNotification(title ?? '안다미로', {
        body: body ?? '',
        icon: '/assets/img/pwa/icon-192.png',
        badge: '/assets/img/pwa/icon-192.png',
        data: { url: url ?? '/exchange' },
      })
    })()
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url ?? '/exchange'
  const targetUrl = new URL(target, self.location.origin).href
  const launchUrl = new URL('/', self.location.origin)
  launchUrl.searchParams.set('notificationTarget', target)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      const exact = list.find((client) => client.url === targetUrl)
      if (exact) return exact.focus()

      const existing = list[0]
      if (existing) {
        await existing.navigate(targetUrl)
        return existing.focus()
      }

      return clients.openWindow(launchUrl.href)
    })
  )
})
