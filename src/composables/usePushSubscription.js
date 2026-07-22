import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function hasVapidPublicKey() {
  return Boolean(VAPID_PUBLIC_KEY)
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function getRegistration() {
  // SW가 이미 이 페이지를 컨트롤 중이면 즉시 반환
  if (navigator.serviceWorker.controller) {
    const reg = await navigator.serviceWorker.getRegistration('/')
    if (reg) return reg
  }
  // 아직 활성화 안 된 경우 최대 20초 대기
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('서비스워커 준비 시간이 초과됐어요. 앱을 완전히 닫았다가 다시 열어주세요.')),
        20000
      )
    ),
  ])
}

export function usePushSubscription() {
  async function subscribe(userId) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window))
      throw new Error('푸시를 지원하지 않는 브라우저예요.')

    if (Notification.permission !== 'granted')
      throw new Error('알림 권한이 허용된 상태에서만 푸시를 설정할 수 있어요.')

    if (!VAPID_PUBLIC_KEY)
      throw new Error('푸시 키가 설정되지 않았어요. 관리자에게 문의해 주세요.')

    const registration = await getRegistration()

    const existing = await registration.pushManager.getSubscription()
    const subscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const { endpoint, keys } = subscription.toJSON()

    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'user_id,endpoint' }
    )
    if (error) throw new Error('구독 저장에 실패했어요.')
  }

  async function unsubscribe(userId) {
    if (!('serviceWorker' in navigator)) return

    const reg = await navigator.serviceWorker.getRegistration('/')
    if (!reg) return
    const subscription = await reg.pushManager.getSubscription()
    if (!subscription) return

    await subscription.unsubscribe()
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
  }

  return { subscribe, unsubscribe }
}
