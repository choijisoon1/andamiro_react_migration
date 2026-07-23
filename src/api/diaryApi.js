import { supabase } from '@/lib/supabase'

// React 상태와 분리한 순수 Supabase 호출 모듈이다.
// 동일한 일기 요청을 메인·리포트·조언 화면에서 재사용하기 위해 기존 Pinia에서 분리했다.
const SAVE_TIMEOUT_MS = 10_000

function requireUserId(userId) {
  if (!userId) throw new Error('not_authenticated')
}

function getMonthRange(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number)

  if (!year || !month || month < 1 || month > 12) {
    throw new Error('invalid_year_month')
  }

  const paddedMonth = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()

  return {
    from: `${year}-${paddedMonth}-01`,
    to: `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`,
  }
}

async function withTimeout(promise, timeoutMs, message) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchDiariesByMonth({ userId, yearMonth }) {
  requireUserId(userId)
  const { from, to } = getMonthRange(yearMonth)
  const { data, error } = await supabase
    .from('emotion_records')
    .select('*')
    .eq('user_id', userId)
    .gte('record_date', from)
    .lte('record_date', to)
    .order('record_date', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchDiaryById({ userId, id }) {
  requireUserId(userId)
  const { data, error } = await supabase
    .from('emotion_records')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function fetchDiaryByDate({ userId, date }) {
  requireUserId(userId)
  const { data, error } = await supabase
    .from('emotion_records')
    .select('*')
    .eq('user_id', userId)
    .eq('record_date', date)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function fetchDiaryStats({ userId }) {
  requireUserId(userId)
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const { from, to } = getMonthRange(`${year}-${String(month).padStart(2, '0')}`)

  const [totalResult, monthlyResult] = await Promise.all([
    supabase
      .from('emotion_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('emotion_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('record_date', from)
      .lte('record_date', to),
  ])

  if (totalResult.error) throw totalResult.error
  if (monthlyResult.error) throw monthlyResult.error

  return {
    total: totalResult.count ?? 0,
    monthly: monthlyResult.count ?? 0,
  }
}

export async function saveDiary({ userId, payload }) {
  requireUserId(userId)
  const { emotion, content, summary, chat_messages: chatMessages } = payload
  const date = payload.date ?? new Date().toISOString().split('T')[0]

  const insertPromise = supabase
    .from('emotion_records')
    .insert({
      user_id: userId,
      record_date: date,
      emotion,
      content,
      result: summary ?? (content ?? '').slice(0, 2000),
      chat_messages: chatMessages ?? [],
    })
    .select('*')
    .single()

  const { data, error } = await withTimeout(
    insertPromise,
    SAVE_TIMEOUT_MS,
    '저장 시간이 초과됐어요. 네트워크를 확인해 주세요.',
  )

  if (error) throw error
  return data
}

export async function updateDiaryResult({ userId, id, result }) {
  requireUserId(userId)
  const { data, error } = await supabase
    .from('emotion_records')
    .update({ result })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw error
  return data
}
