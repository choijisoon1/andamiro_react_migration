import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import './ChatComposer.scss'

const ChatComposer = forwardRef(function ChatComposer({
  value = '',
  placeholder = '질문을 입력해 보세요',
  disabled = false,
  canSend = false,
  showAttach = false,
  showVoice = false,
  isVoiceOn = false,
  voiceAutoSendSeconds = 2,
  accept = 'image/*',
  onChange,
  onSend,
  onAttach,
  onFileChange,
  onToggleVoice,
  onStopVoice,
  onKeyDown,
}, ref) {
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  function autoResize() {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`
  }

  // Vue defineExpose로 제공하던 두 동작을 부모가 동일하게 호출할 수 있도록 노출한다.
  useImperativeHandle(ref, () => ({
    autoResize,
    openFilePicker: () => fileInputRef.current?.click(),
  }))

  useEffect(() => {
    autoResize()
  }, [value])

  return (
    <footer className="chat-composer">
      {showVoice && isVoiceOn && (
        <div className="chat-voice-banner">
          <span className="chat-voice-banner__pulse" aria-hidden="true" />
          <span className="chat-voice-banner__text">
            음성 대화 중 — 말씀하신 뒤 {voiceAutoSendSeconds}초 뒤 자동 전송돼요
          </span>
          <button
            type="button"
            className="chat-voice-banner__cancel"
            onClick={onStopVoice}
          >
            취소
          </button>
        </div>
      )}

      <div className="chat-composer__row">
        {showAttach && (
          <button
            type="button"
            className="chat-composer__attach"
            aria-label="사진 첨부"
            onClick={onAttach}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M9 4v10M4 9h10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}

        <div className="chat-composer__field">
          <label className="chat-visually-hidden" htmlFor="chatInput">메시지 입력</label>
          <textarea
            id="chatInput"
            ref={textareaRef}
            value={value}
            className="chat-composer__input"
            rows="1"
            placeholder={placeholder}
            autoComplete="off"
            disabled={disabled}
            onChange={(event) => {
              onChange?.(event.target.value)
              autoResize()
            }}
            onKeyDown={onKeyDown}
          />
          {showVoice && (
            <button
              type="button"
              className={`chat-composer__mic${isVoiceOn ? ' is-recording' : ''}`}
              aria-pressed={isVoiceOn}
              aria-label="음성 대화"
              onClick={onToggleVoice}
            >
              음성대화
            </button>
          )}
          <button
            type="button"
            className="chat-composer__send"
            disabled={!canSend}
            aria-label="보내기"
            onClick={onSend}
          >
            입력
          </button>
        </div>
      </div>

      {showAttach && (
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="chat-visually-hidden"
          tabIndex="-1"
          aria-hidden="true"
          onChange={onFileChange}
        />
      )}
    </footer>
  )
})

export default ChatComposer
