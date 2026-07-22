import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'

export const useJoinStore = defineStore('join', () => {
  const nickname  = ref('')
  const ageGroup  = ref('')
  const gender    = ref('')

  async function saveProfile() {
    const uid = useAuthStore().user?.id
    if (!uid) throw new Error('not_authenticated')

    const { error } = await supabase.from('profiles').insert({
      id:        uid,
      nickname:  nickname.value,
      age_group: ageGroup.value,
      gender:    gender.value,
    })
    if (error) throw error
  }

  function reset() {
    nickname.value = ''
    ageGroup.value = ''
    gender.value   = ''
  }

  return { nickname, ageGroup, gender, saveProfile, reset }
})
