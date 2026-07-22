import { supabase } from '@/lib/supabase'

const FALLBACK_CHIPS = ['더 자세히 말해볼게요', '다른 이야기도 있어요', '기록 마무리할게요']

/**
 * n8n 워크플로우를 통해 AI 대화를 처리합니다.
 *
 * n8n 워크플로우 입력 (Webhook Body):
 * {
 *   emotion: string,          // 'best' | 'good' | 'normal' | 'bad' | 'worst'
 *   messages: Array<{ role: 'user'|'assistant', text: string }>,
 *   userId: string,
 *   image?: { base64: string, mediaType: string }
 * }
 *
 * n8n 워크플로우 출력 (Respond to Webhook 노드):
 * {
 *   reply: string,            // AI 응답 텍스트
 *   chips?: string[]          // 추천 팔로우업 칩 (최대 4개 권장)
 * }
 */
const RETRY_STATUSES = new Set([429, 529])
const MAX_RETRIES    = 3
const RETRY_DELAY_MS = 3000

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export function useChatN8n() {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL

  async function send(emotionType, messages, pendingImage = null) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('로그인이 필요해요.')

    const payload = {
      emotion: emotionType,
      messages: messages
        .filter(m => (m.role === 'user' || m.role === 'assistant') && m.text)
        .map(m => ({ role: m.role, text: m.text })),
      userId: session.user.id,
    }

    if (pendingImage?.base64) {
      payload.image = { base64: pendingImage.base64, mediaType: pendingImage.mediaType }
    }

    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    }

    let res
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) await delay(RETRY_DELAY_MS * attempt)
      res = await fetch(webhookUrl, options)
      if (res.ok || !RETRY_STATUSES.has(res.status)) break
    }

    if (!res.ok) {
      const err = new Error('워크플로우 오류')
      err.status = res.status
      throw err
    }

    const data = await res.json()

    // n8n은 배열로 감싸서 반환하는 경우가 있음
    const item = Array.isArray(data) ? data[0] : data

    if (typeof item === 'string') {
      return { reply: item, chips: FALLBACK_CHIPS }
    }

    const reply = item?.reply ?? item?.text ?? item?.message ?? item?.output ?? ''
    const chips = Array.isArray(item?.chips) && item.chips.length > 0
      ? item.chips
      : FALLBACK_CHIPS

    return { reply, chips }
  }

  return { send, isEnabled: !!webhookUrl }
}
