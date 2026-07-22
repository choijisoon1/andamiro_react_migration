import { supabase } from '@/lib/supabase'

const SYSTEM =
  "당신은 감정 일기 AI 조언가입니다. " +
  "주어진 감정과 오늘의 인사이트를 바탕으로 반드시 유효한 JSON 하나만 응답합니다. " +
  "코드블록·설명·추가 텍스트 없이 JSON만 반환하세요."

export function useAdviceEnricher() {
  async function enrich(emotion, insight) {
    const prompt =
      `선택 감정: ${emotion}\n인사이트: ${insight}\n\n` +
      `아래 JSON 스키마로만 응답하세요:\n` +
      `{"color":"오늘의 추천 컬러와 의미 1~2문장(예: 오늘은 초록(그린)이 당신에게 따뜻한 안정감을 가져다줄 거예요! 💚)",` +
      `"tags":["감정 키워드1","감정 키워드2","감정 키워드3"],` +
      `"tips":[{"title":"오늘의 감정 케어","body":"오늘 감정 상태에 맞는 구체적인 돌봄 방법 한 문장"},{"title":"내일을 위한 조언","body":"내일 기분 좋게 시작할 수 있는 실천 팁 한 문장"}]}`

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('로그인이 필요해요.')

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || '조언 생성 실패')

    const text = data?.content?.[0]?.text
    if (!text) throw new Error('응답 없음')

    const clean = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    return JSON.parse(clean)
  }

  return { enrich }
}
