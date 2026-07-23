import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import FooterText from '@/components/layout/FooterText'
import PageLayout from '@/components/layout/PageLayout'
import { useChatStore } from '@/stores/chatStore'

const INITIAL_EMOTIONS = [
  { type: 'best', label: '최고예요', weatherLabel: '최고예요' },
  { type: 'good', label: '좋아요', weatherLabel: '조금흐림' },
  { type: 'normal', label: '보통이에요', weatherLabel: '흐림' },
  { type: 'bad', label: '별로에요', weatherLabel: '별로예요' },
  { type: 'worst', label: '최악이에요', weatherLabel: '최악이에요' },
]

function EmotionView() {
  const navigate = useNavigate()
  const setEmotion = useChatStore((state) => state.setEmotion)
  const setEmotionLabel = useChatStore((state) => state.setEmotionLabel)
  const [emotions, setEmotions] = useState(INITIAL_EMOTIONS)
  const [selected, setSelected] = useState(null)
  const buttonElements = useRef(new Map())
  const previousPositions = useRef(null)

  // Vue TransitionGroup이 제공하던 FLIP 이동 효과를 동일한 350ms/easing 값으로 대체한다.
  useLayoutEffect(() => {
    if (!previousPositions.current) return

    buttonElements.current.forEach((element, type) => {
      const previous = previousPositions.current.get(type)
      if (!previous) return

      const current = element.getBoundingClientRect()
      const deltaX = previous.left - current.left
      const deltaY = previous.top - current.top

      if (deltaX || deltaY) {
        element.animate(
          [
            { transform: `translate(${deltaX}px, ${deltaY}px)` },
            { transform: 'translate(0, 0)' },
          ],
          {
            duration: 350,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          },
        )
      }
    })

    previousPositions.current = null
  }, [emotions])

  const bodyClass = `emotion ${selected ? `bg-${selected.type}` : 'bg-none'}`
  const previewCaption = selected?.label ?? '• • •'
  const previewImage = selected
    ? `/assets/img/emotion/img-${selected.type}.png`
    : '/assets/img/emotion/img-none.png'

  function selectEmotion(emotion) {
    previousPositions.current = new Map(
      [...buttonElements.current.entries()].map(([type, element]) => [
        type,
        element.getBoundingClientRect(),
      ]),
    )

    setSelected(emotion)
    setEmotions((currentEmotions) => {
      const selectedIndex = currentEmotions.findIndex((item) => item.type === emotion.type)
      if (selectedIndex <= 0) return currentEmotions
      return [emotion, ...currentEmotions.filter((item) => item.type !== emotion.type)]
    })
  }

  function startChat() {
    if (!selected) return
    setEmotion(selected.type)
    setEmotionLabel(selected.label)
    navigate('/chat')
  }

  return (
    <PageLayout
      bodyClass={bodyClass}
      hideHeader
      footer={(
        <FooterText
          pointer
          pointerVisible={Boolean(selected)}
          subText="오늘의 감정톡"
          mainText="감정 선택하고 대화 시작하기"
          label="시작하기"
          disabled={!selected}
          onClick={startChat}
        />
      )}
    >
      <section className="text-content" aria-labelledby="emotion-screen-title">
        <div className="text-group">
          <span id="emotion-screen-sub">가장 가까운 감정을 골라주세요</span>
          <em id="emotion-screen-title">지금 기분이 어때요?</em>
        </div>
      </section>

      <section className="emotion-content" aria-label="선택한 감정 미리보기">
        <div className="emotion-preview-card" aria-live="polite">
          <p className="emotion-preview-caption" aria-hidden={!selected}>
            {previewCaption}
          </p>
          <div className="emotion-preview-emoji" aria-hidden="true">
            <span className="emotion-preview-emoji__icon">
              <img className="emotion-preview-image" src={previewImage} alt="선택된 감정" />
            </span>
          </div>
        </div>
      </section>

      <section className="btn-content" aria-label="감정 선택">
        <div
          className="btn-group"
          role="group"
          aria-labelledby="emotion-screen-title"
          aria-live="polite"
        >
          {emotions.map((emotion) => (
            <button
              key={emotion.type}
              ref={(element) => {
                if (element) buttonElements.current.set(emotion.type, element)
                else buttonElements.current.delete(emotion.type)
              }}
              type="button"
              className={`emotion-option${selected?.type === emotion.type ? ' is-active' : ''}`}
              data-emotion-type={emotion.type}
              aria-pressed={selected?.type === emotion.type}
              onClick={() => selectEmotion(emotion)}
            >
              <span className="emotion-option__label">{emotion.label}</span>
            </button>
          ))}
        </div>
      </section>
    </PageLayout>
  )
}

export default EmotionView
