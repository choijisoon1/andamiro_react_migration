import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ModalButton from '@/components/common/ModalButton'
import ChatComposer from '@/components/layout/ChatComposer'
import ModalBottom from '@/components/layout/ModalBottom'
import PageLayout from '@/components/layout/PageLayout'
import { useChatAgent } from '@/composables/useChatAgent'
import { useChatN8n } from '@/composables/useChatN8n'
import { useChatStore } from '@/stores/chatStore'

const GREETING_LINE2 = {
  best: '오늘의 하루가 정말 최고였어요!',
  good: '오늘의 하루가 좋으셨군요!',
  normal: '오늘의 하루는 어떠셨나요?',
  bad: '오늘의 하루가 좀 힘드셨군요.',
  worst: '오늘의 하루가 너무 힘드셨군요.',
}

const STARTER_CHIPS = {
  best: ['에너지가 넘쳐요', '기분이 아주 좋아요', '활기차고 자신 있어요', '오늘 잘될 것 같아요'],
  good: ['기분이 괜찮아요', '안정적이고 편안해요', '차분하고 좋아요', '마음이 가벼워요'],
  normal: ['무난해요', '그냥 그래요', '차분해요', '특별한 건 없어요'],
  bad: ['의욕이 없어요', '피곤하고 처져요', '마음이 무거워요', '집중이 잘 안 돼요'],
  worst: ['너무 지쳤어요', '불안하고 초조해요', '머리가 복잡해요', '버겁고 힘들어요'],
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']
const IMAGE_MAX_DIM = 640
const IMAGE_QUALITY = 0.70
const VOICE_AUTO_SEND_MS = 2000

function formatTime(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours < 12 ? '오전' : '오후'} ${hours % 12 || 12}:${minutes}`
}

function formatDateSeparator(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${DAY_KO[date.getDay()]}요일`
}

function shouldShowDateSeparator(messages, index) {
  if (index === 0) return true
  const previous = messages[index - 1]
  const current = messages[index]
  if (!previous?.time || !current?.time) return false
  return new Date(previous.time).toDateString() !== new Date(current.time).toDateString()
}

function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const classes = `chat-msg ${isUser ? 'chat-msg--user' : 'chat-msg--ai'}`
  const content = message.dataUrl ? (
    <div className="chat-msg__img-wrap">
      <img src={message.dataUrl} alt="첨부 이미지" />
    </div>
  ) : (
    <p className="chat-msg__bubble">{message.text}</p>
  )

  if (isUser) {
    return (
      <div className={classes}>
        <div className="chat-msg__body">{content}</div>
        <span className="chat-msg__time">{formatTime(message.time)}</span>
      </div>
    )
  }

  return (
    <div className={classes}>
      <img
        className="chat-msg__avatar"
        src="/assets/img/andamiro-favicon-180.png"
        alt="안다미로"
      />
      <div className="chat-msg__col">
        <span className="chat-msg__sender">안다미로</span>
        <div className="chat-msg__body-row">
          <div className="chat-msg__body">{content}</div>
          <span className="chat-msg__time">{formatTime(message.time)}</span>
        </div>
      </div>
    </div>
  )
}

function ChatView() {
  const navigate = useNavigate()
  const emotion = useChatStore((state) => state.emotion)
  const messages = useChatStore((state) => state.messages)
  const addMessage = useChatStore((state) => state.addMessage)
  const setContent = useChatStore((state) => state.setContent)
  const { send } = useChatAgent()
  const { send: sendN8n, isEnabled: useN8n } = useChatN8n()
  const [inputText, setInputText] = useState('')
  const [showIntro, setShowIntro] = useState(() => messages.length === 0)
  const [isThinking, setIsThinking] = useState(false)
  const [isVoiceOn, setIsVoiceOn] = useState(false)
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [showUnsavedBackModal, setShowUnsavedBackModal] = useState(false)
  const [aiChips, setAiChips] = useState([])
  const chatThreadRef = useRef(null)
  const composerRef = useRef(null)
  const pendingImageRef = useRef(null)
  const recognitionRef = useRef(null)
  const voiceFinalAccumRef = useRef('')
  const voiceAutoSendTimerRef = useRef(null)
  const isVoiceOnRef = useRef(false)
  const isThinkingRef = useRef(false)

  const greetingLine2 = GREETING_LINE2[emotion] ?? GREETING_LINE2.good
  const starterChips = STARTER_CHIPS[emotion] ?? STARTER_CHIPS.good
  const canSend = inputText.trim().length > 0 && !isThinking
  const hasUnsavedChat = messages.length > 0 || Boolean(emotion)

  function setThinking(value) {
    isThinkingRef.current = value
    setIsThinking(value)
  }

  function setVoiceActive(value) {
    isVoiceOnRef.current = value
    setIsVoiceOn(value)
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const thread = chatThreadRef.current
      if (thread) thread.scrollTop = thread.scrollHeight
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [aiChips, isThinking, messages, showIntro])

  function clearVoiceTimer() {
    if (!voiceAutoSendTimerRef.current) return
    window.clearTimeout(voiceAutoSendTimerRef.current)
    voiceAutoSendTimerRef.current = null
  }

  function stopVoice() {
    setVoiceActive(false)
    voiceFinalAccumRef.current = ''
    clearVoiceTimer()
    try {
      recognitionRef.current?.stop()
    } catch {
      // 이미 종료된 브라우저 음성 인식 인스턴스는 무시한다.
    }
    recognitionRef.current = null
  }

  useEffect(() => () => {
    isVoiceOnRef.current = false
    clearVoiceTimer()
    try {
      recognitionRef.current?.stop()
    } catch {
      // 언마운트 시 이미 종료된 음성 인식 인스턴스는 무시한다.
    }
  }, [])

  async function callAI() {
    setThinking(true)
    const pendingImage = pendingImageRef.current
    pendingImageRef.current = null

    try {
      // Zustand set은 즉시 반영되지만 현재 React 렌더의 messages 변수는 이전 값일 수 있다.
      const latestMessages = useChatStore.getState().messages
      let replyText

      if (useN8n) {
        const result = await sendN8n(emotion, latestMessages, pendingImage)
        replyText = result.reply
        setAiChips(result.chips)
      } else {
        replyText = await send(emotion, latestMessages, pendingImage)
        setAiChips([])
      }

      addMessage('assistant', replyText)
    } catch (error) {
      const status = error.status
      const message = status === 401
        ? 'API 키 인증에 실패했어요. 관리자에게 문의해 주세요.'
        : status === 429
          ? '요청이 많아 잠시 막혔어요. 잠시 후 다시 시도해 주세요.'
          : status === 529
            ? 'AI 서버가 바빠요. 잠시 후 다시 시도해 주세요.'
            : '죄송해요, 잠시 문제가 생겼어요. 다시 말씀해 주세요 🙏'
      addMessage('assistant', message)
      setAiChips([])
    } finally {
      setThinking(false)
    }
  }

  async function handleUserMessage(text) {
    if (isThinkingRef.current) return
    addMessage('user', text)
    setShowIntro(false)
    await callAI()
  }

  async function sendMessage() {
    const text = inputText.trim()
    if (!text || isThinkingRef.current) return
    setInputText('')
    composerRef.current?.autoResize()
    await handleUserMessage(text)
  }

  function handleKeyDown(event) {
    if (
      event.key === 'Enter'
      && !event.shiftKey
      && !event.nativeEvent.isComposing
      && event.keyCode !== 229
    ) {
      event.preventDefault()
      sendMessage()
    }
  }

  function finishDiary() {
    if (isThinkingRef.current) return
    const latestMessages = useChatStore.getState().messages
    const content = latestMessages
      .filter((message) => message.role === 'user' && message.text)
      .map((message) => message.text)
      .join('\n')
    setContent(content)
    navigate('/chat/result')
  }

  function handleBackClick() {
    if (hasUnsavedChat) {
      setShowUnsavedBackModal(true)
      return
    }
    navigate('/main')
  }

  function downscaleImage(dataUrl) {
    return new Promise((resolve) => {
      const image = new Image()
      image.onload = () => {
        const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(image.width, image.height))
        const width = Math.round(image.width * scale)
        const height = Math.round(image.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(image, 0, 0, width, height)
        const output = canvas.toDataURL('image/jpeg', IMAGE_QUALITY)
        resolve({
          dataUrl: output,
          base64: output.split(',')[1],
          mediaType: 'image/jpeg',
        })
      }
      image.onerror = () => resolve({
        dataUrl,
        base64: dataUrl.split(',')[1] ?? '',
        mediaType: 'image/jpeg',
      })
      image.src = dataUrl
    })
  }

  function handleImageFile(event) {
    const file = event.target?.files?.[0]
    if (!file) return
    event.target.value = ''

    const reader = new FileReader()
    reader.onload = async (loadEvent) => {
      const rawDataUrl = loadEvent.target?.result
      if (!rawDataUrl) return
      const result = await downscaleImage(rawDataUrl)
      pendingImageRef.current = result
      addMessage('user', '', result.dataUrl)
      setShowIntro(false)
      await callAI()
    }
    reader.readAsDataURL(file)
  }

  function scheduleVoiceAutoSend() {
    clearVoiceTimer()
    voiceAutoSendTimerRef.current = window.setTimeout(() => {
      const text = voiceFinalAccumRef.current.trim()
      if (!text) return
      voiceFinalAccumRef.current = ''
      setInputText('')
      composerRef.current?.autoResize()
      handleUserMessage(text)
    }, VOICE_AUTO_SEND_MS)
  }

  function restartVoiceAfter(delay) {
    window.setTimeout(() => {
      if (!isVoiceOnRef.current) return
      try {
        recognitionRef.current?.start()
      } catch {
        // 브라우저가 이미 재시작 중인 경우 중복 start를 무시한다.
      }
    }, delay)
  }

  function toggleVoice() {
    if (isThinkingRef.current) return
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      window.alert('음성 입력은 Chrome·Edge 등에서 지원됩니다.')
      return
    }
    if (isVoiceOnRef.current) {
      stopVoice()
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      setVoiceActive(true)
      voiceFinalAccumRef.current = ''
    }
    recognition.onresult = (event) => {
      let interim = ''
      let receivedFinal = false

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) {
          voiceFinalAccumRef.current += result[0].transcript
          receivedFinal = true
        } else {
          interim += result[0].transcript
        }
      }

      setInputText((voiceFinalAccumRef.current + interim).trim())
      if (receivedFinal) scheduleVoiceAutoSend()
    }
    recognition.onend = () => {
      if (isVoiceOnRef.current) restartVoiceAfter(80)
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        window.alert('마이크 권한이 필요해요.')
        stopVoice()
        return
      }
      if (event.error === 'aborted') return
      if (event.error === 'no-speech' || event.error === 'network') restartVoiceAfter(200)
    }

    try {
      recognition.start()
    } catch {
      stopVoice()
    }
  }

  return (
    <>
      <PageLayout
        title="오늘의 일기"
        backTo="/main"
        interceptBack
        onBack={handleBackClick}
        mainClassName="chat-thread"
        footer={(
          <ChatComposer
            ref={composerRef}
            value={inputText}
            placeholder="질문을 입력해 보세요"
            disabled={isThinking}
            canSend={canSend}
            showAttach
            showVoice
            isVoiceOn={isVoiceOn}
            voiceAutoSendSeconds={VOICE_AUTO_SEND_MS / 1000}
            accept="image/*"
            onChange={setInputText}
            onSend={sendMessage}
            onAttach={() => setShowAttachModal(true)}
            onFileChange={handleImageFile}
            onToggleVoice={toggleVoice}
            onStopVoice={stopVoice}
            onKeyDown={handleKeyDown}
          />
        )}
      >
        <div
          ref={chatThreadRef}
          className="chat-messages"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {showIntro && (
            <div className="chat-msg chat-msg--opening">
              <section className="chat-opening__text">
                <h2 className="chat-opening__title">
                  안녕하세요!<br />
                  <span>{greetingLine2}</span>
                </h2>
                <p className="chat-opening__sub">선택하신 감정의 세부 감정을 선택해주세요</p>
              </section>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={`${message.time?.toString() ?? 'message'}-${index}`}>
              {shouldShowDateSeparator(messages, index) && (
                <div className="chat-date-sep">
                  <span>{formatDateSeparator(message.time)}</span>
                </div>
              )}
              {(message.dataUrl || message.text) && <ChatMessage message={message} />}
            </div>
          ))}

          {isThinking && (
            <div className="chat-msg chat-msg--ai" aria-label="AI 응답 중">
              <img
                className="chat-msg__avatar"
                src="/assets/img/andamiro-favicon-180.png"
                alt="안다미로"
              />
              <div className="chat-msg__col">
                <span className="chat-msg__sender">안다미로</span>
                <div className="chat-msg__body">
                  <div className="chat-typing"><span /><span /><span /></div>
                </div>
              </div>
            </div>
          )}

          {showIntro && (
            <div className="chat-chips-wrap">
              <div className="chat-chips chat-chips--grid">
                {starterChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="chat-chip"
                    onClick={() => handleUserMessage(chip)}
                  >
                    {chip}
                  </button>
                ))}
                <button type="button" className="chat-chip chat-chip--finish" onClick={finishDiary}>
                  기록완료
                </button>
              </div>
            </div>
          )}

          {!showIntro && messages.length > 0 && !isThinking && (
            <div className="chat-chips-wrap">
              <div className="chat-chips">
                {aiChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="chat-chip"
                    onClick={() => handleUserMessage(chip)}
                  >
                    {chip}
                  </button>
                ))}
                <button type="button" className="chat-chip chat-chip--finish" onClick={finishDiary}>
                  기록완료
                </button>
              </div>
            </div>
          )}
        </div>
      </PageLayout>

      <ModalBottom
        show={showUnsavedBackModal}
        title="조금만 더 쓰면 완성이에요!"
        description={(
          <>
            나가면 작성하던 내용이 저장되지 않아요<br />
            지금의 감정을 조금만 더 기록해 볼까요?
          </>
        )}
        onClose={() => setShowUnsavedBackModal(false)}
        footer={(
          <div className="button-content--duo">
            <button
              type="button"
              className="btn-ctp--secondary"
              onClick={() => {
                setShowUnsavedBackModal(false)
                navigate('/main')
              }}
            >
              다음에 하기
            </button>
            <button
              type="button"
              className="btn-ctp"
              onClick={() => setShowUnsavedBackModal(false)}
            >
              계속 작성하기
            </button>
          </div>
        )}
      >
        <div className="img-content">
          <p className="img-group ok-diary">
            <img src="/assets/img/emotion/img-none.png" style={{ height: '156px' }} alt="" />
          </p>
        </div>
      </ModalBottom>

      <ModalBottom
        show={showAttachModal}
        title="어떻게 기록할까요?"
        titleClass="title-l"
        onClose={() => setShowAttachModal(false)}
        footer={(
          <div className="button-content">
            <div className="button-group">
              <ModalButton
                title="사진 업로드"
                description="갤러리에서 사진을 선택하세요"
                icon="photo"
                onClick={() => {
                  setShowAttachModal(false)
                  composerRef.current?.openFilePicker()
                }}
              />
              {/* 실시간 표정 분석 버튼은 EmotionCameraPopup 이관과 함께 동일 위치에 연결한다. */}
            </div>
          </div>
        )}
      />
    </>
  )
}

export default ChatView
