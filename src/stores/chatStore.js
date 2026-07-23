import { create } from 'zustand'

// 채팅 작성 중인 값은 서버 데이터가 아니므로 TanStack Query가 아닌 Zustand로 공유한다.
// 기존 Pinia chat.js는 남은 Vue 화면의 이관 기준으로 보존한다.
export const useChatStore = create((set) => ({
  emotion: '',
  emotionLabel: '',
  content: '',
  messages: [],
  recordDate: null,

  setEmotion: (emotion) => set({ emotion }),
  setEmotionLabel: (emotionLabel) => set({ emotionLabel }),
  setContent: (content) => set({ content }),
  setRecordDate: (recordDate) => set({ recordDate }),
  addMessage: (role, text, dataUrl = null) => set((state) => ({
    messages: [
      ...state.messages,
      {
        role,
        text: text ?? '',
        dataUrl: dataUrl ?? null,
        time: new Date(),
      },
    ],
  })),
  reset: () => set({
    emotion: '',
    emotionLabel: '',
    content: '',
    messages: [],
    recordDate: null,
  }),
}))
