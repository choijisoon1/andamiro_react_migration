import { supabase } from '@/lib/supabase'

const SYSTEM =
  "당신은 감정 일기 AI 분석가입니다. " +
  "사용자의 채팅 기록을 분석해 반드시 유효한 JSON 하나만 응답합니다. " +
  "코드블록·설명·추가 텍스트 없이 JSON만 반환하세요."

function buildMessage(emotionType, messages) {
  const convo = messages
    .filter(m => (m.role === 'user' || m.role === 'assistant') && m.text)
    .map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.text}`)
    .join('\n')

  return (
    `선택 감정: ${emotionType}\n\n채팅:\n${convo || '(대화 없음)'}\n\n` +
    `아래 JSON 스키마로만 응답하세요:\n` +
    `{"score":0~100정수,"mood":"2~5자 한국어 감정 단어(예: 평온함, 활기참, 뿌듯함, 무기력, 불안함)","headline":"오늘 하루를 표현한 한 줄 제목(예: 안정적이고 균형잡힌 날, 활기차고 에너지 넘치는 날, 조금 지치고 무거운 날 등 10~20자)","metrics":{"에너지":0~100,"안정감":0~100,"집중력":0~100,"긍정성":0~100},"insight":"오늘 하루 공감 메시지 2~4문장","recommendations":[{"title":"내일 활동 제목","body":"한 줄 설명"},{"title":"내일 활동 제목2","body":"한 줄 설명2"}],"summary":"채팅 내용 100자 이내 요약","color":"오늘의 추천 컬러와 의미 1~2문장(예: 오늘은 초록(그린)이 당신에게 따뜻한 안정감을 가져다줄 거예요! 💚)","tags":["감정 키워드1","감정 키워드2","감정 키워드3"],"tips":[{"title":"오늘의 감정 케어","body":"오늘 감정 상태에 맞는 구체적인 돌봄 방법 한 문장"},{"title":"내일을 위한 조언","body":"내일 기분 좋게 시작할 수 있는 실천 팁 한 문장"}]}`
  )
}

export function useAnalysisAgent() {
  async function analyze(emotionType, messages) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('로그인이 필요해요.')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25000)
    let res
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: SYSTEM,
          messages: [{ role: 'user', content: buildMessage(emotionType, messages) }],
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    const data = await res.json()

    if (!res.ok) {
      const msg = data?.error?.message || data?.error || '분석 실패'
      throw new Error(String(msg))
    }

    const text = data?.content?.[0]?.text
    if (!text) throw new Error('응답 없음')

    const clean = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    return JSON.parse(clean)
  }

  return { analyze }
}
