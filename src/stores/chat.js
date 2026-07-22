import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
  const emotion      = ref('')
  const emotionLabel = ref('')
  const content      = ref('')
  const messages     = ref([])
  const recordDate   = ref(null)

  function addMessage(role, text, dataUrl = null) {
    messages.value.push({ role, text: text ?? '', dataUrl: dataUrl ?? null, time: new Date() })
  }

  function reset() {
    emotion.value      = ''
    emotionLabel.value = ''
    content.value      = ''
    messages.value     = []
    recordDate.value   = null
  }

  return { emotion, emotionLabel, content, messages, recordDate, addMessage, reset }
})
