import { create } from 'zustand'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export const useJoinStore = create((set, get) => ({
  nickname: '',
  ageGroup: '',
  gender: '',

  setNickname: (nickname) => set({ nickname }),
  setAgeGroup: (ageGroup) => set({ ageGroup }),
  setGender: (gender) => set({ gender }),

  saveProfile: async () => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) throw new Error('not_authenticated')

    const { nickname, ageGroup, gender } = get()
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      nickname,
      age_group: ageGroup,
      gender,
    })

    if (error) throw error
  },

  reset: () => set({ nickname: '', ageGroup: '', gender: '' }),
}))
