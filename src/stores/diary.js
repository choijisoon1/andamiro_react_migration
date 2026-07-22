import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'


export const useDiaryStore = defineStore('diary', () => {
  const diaries = ref([])
  const stats   = ref({ total: 0, monthly: 0 })

  function userId() {
    return useAuthStore().user?.id
  }

  async function fetchByMonth(yearMonth) {
    const uid = userId()
    if (!uid) return
    const [y, m] = yearMonth.split('-')
    const from = `${y}-${m}-01`
    const to   = `${y}-${m}-${new Date(y, m, 0).getDate()}`
    const { data } = await supabase
      .from('emotion_records')
      .select('*')
      .eq('user_id', uid)
      .gte('record_date', from)
      .lte('record_date', to)
      .order('record_date', { ascending: false })
    diaries.value = data ?? []
  }

  async function getById(id) {
    const uid = userId()
    if (!uid) return null
    const { data } = await supabase
      .from('emotion_records')
      .select('*')
      .eq('id', id)
      .eq('user_id', uid)
      .maybeSingle()
    return data ?? null
  }

  async function getByDate(date) {
    const uid = userId()
    if (!uid) return null
    const { data } = await supabase
      .from('emotion_records')
      .select('*')
      .eq('user_id', uid)
      .eq('record_date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ?? null
  }

  async function save(payload) {
    const uid = userId()
    if (!uid) throw new Error('not_authenticated')

    const { emotion, content, summary, chat_messages } = payload
    const date = payload.date ?? new Date().toISOString().split('T')[0]

    // 현재는 여러 기록을 허용하기 위해 insert를 유지한다.
    // 추후 하루 1개 저장 정책이 필요해지면 user_id + record_date 기준 upsert로 전환한다.
    const insertPromise = supabase
      .from('emotion_records')
      .insert({
        user_id:       uid,
        record_date:   date,
        emotion,
        content,
        result:        summary ?? (content ?? '').slice(0, 2000),
        chat_messages: chat_messages ?? [],
      })

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('저장 시간이 초과됐어요. 네트워크를 확인해 주세요.')), 10000)
    )

    const { error } = await Promise.race([insertPromise, timeout])
    if (error) throw error
  }

  async function fetchStats() {
    const uid = userId()
    if (!uid) return
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const from = `${y}-${m}-01`
    const to   = `${y}-${m}-${String(new Date(y, today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
    const [totalRes, monthlyRes] = await Promise.all([
      supabase.from('emotion_records').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('emotion_records').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('record_date', from).lte('record_date', to),
    ])
    stats.value.total   = totalRes.count   ?? 0
    stats.value.monthly = monthlyRes.count ?? 0
  }

  async function updateResult(id, result) {
    await supabase
      .from('emotion_records')
      .update({ result })
      .eq('id', id)
  }

  return { diaries, stats, fetchByMonth, getById, getByDate, save, updateResult, fetchStats }
})
