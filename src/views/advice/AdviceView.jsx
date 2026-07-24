import { useEffect, useMemo, useRef, useState } from 'react'

import NoData from '@/components/common/NoData'
import AppTabBar from '@/components/layout/AppTabBar'
import ModalFull from '@/components/layout/ModalFull'
import PageLayout from '@/components/layout/PageLayout'
import { useAdviceEnricher } from '@/composables/useAdviceEnricher'
import { formatLocalDate } from '@/lib/date'
import {
  useDiaryByDateQuery,
  useUpdateDiaryResultMutation,
} from '@/queries/diaryQueries'

import './AdviceView.scss'

const SCORE_BY_EMOTION = { best: 92, good: 72, normal: 58, bad: 42, worst: 28 }
const EMOTION_KO = {
  best: '최고예요!',
  good: '좋아요!',
  normal: '보통이에요',
  bad: '별로예요',
  worst: '최악이에요',
}
const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const FORTUNES = [
  '오후 3시, 달콤한 커피 한 잔이 당신의 운을 깨워줄 거예요.',
  '이미 당신 마음 속에 답이 있어요. 그 길을 믿고 나아가세요.',
  '조금 늦더라도 괜찮아요. 당신의 속도는 틀리지 않았습니다.',
  '오늘은 주변의 조언보다 당신의 직감을 따르는 것이 좋습니다.',
  '생각보다 큰 행운이 가까이 와 있어요. 마음을 열고 기다려보세요.',
  '완벽하지 않아도 괜찮습니다. 시작했다는 것만으로도 충분해요.',
]
const COOKIE_IMAGE = '/assets/img/advice/popup-img-fortune.png'

function parseResult(result) {
  try {
    return JSON.parse(result ?? '')
  } catch {
    return null
  }
}

function adviceTipTitle(title) {
  return title === '내일을 위한 루틴' ? '내일을 위한 조언' : title
}

function AdviceView() {
  const [today] = useState(() => new Date())
  const todayString = formatLocalDate(today)
  const { data: diaryRecord = null } = useDiaryByDateQuery(todayString)
  const updateDiaryResult = useUpdateDiaryResultMutation()
  const { enrich } = useAdviceEnricher()
  const [enrichedRecord, setEnrichedRecord] = useState(null)
  const [showFortune, setShowFortune] = useState(false)
  const [isOpened, setIsOpened] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [fortuneText, setFortuneText] = useState('')
  const [cookieSrc, setCookieSrc] = useState(COOKIE_IMAGE)
  const enrichRef = useRef(enrich)
  const updateDiaryResultRef = useRef(updateDiaryResult.mutateAsync)
  const enrichmentRef = useRef({ recordId: null, promise: null })
  const openTimerRef = useRef(null)
  const revealTimerRef = useRef(null)

  const record = enrichedRecord?.id === diaryRecord?.id ? enrichedRecord : diaryRecord
  const parsed = useMemo(() => parseResult(record?.result), [record?.result])
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 ${DAYS[today.getDay()]}요일`
  const score = SCORE_BY_EMOTION[record?.emotion] ?? 0
  const headline = parsed?.headline ?? EMOTION_KO[record?.emotion] ?? '오늘의 감정'
  const adviceText = parsed?.insight ?? record?.result ?? ''
  const colorText = parsed?.color ?? ''
  const tags = parsed?.tags ?? []
  const tips = parsed?.tips ?? []

  useEffect(() => {
    const originalParsed = parseResult(diaryRecord?.result)
    const needsEnrichment = originalParsed
      && (!originalParsed.color || !originalParsed.tags || !originalParsed.tips)

    if (!diaryRecord || !needsEnrichment) return

    // React 개발 모드의 effect 재실행에서도 AI 요청과 Supabase 갱신은 한 번만 공유한다.
    if (enrichmentRef.current.recordId !== diaryRecord.id) {
      const promise = enrichRef.current(
        diaryRecord.emotion,
        originalParsed.insight ?? diaryRecord.result ?? '',
      ).then(async (extra) => {
        const mergedRecord = {
          ...diaryRecord,
          result: JSON.stringify({ ...originalParsed, ...extra }),
        }
        await updateDiaryResultRef.current({
          id: mergedRecord.id,
          result: mergedRecord.result,
        })
        return mergedRecord
      }).catch(() => null)

      enrichmentRef.current = { recordId: diaryRecord.id, promise }
    }

    enrichmentRef.current.promise.then((nextRecord) => {
      // 보강 요청이 실패하면 Vue 화면과 동일하게 기존 일기 내용을 그대로 유지한다.
      if (nextRecord) setEnrichedRecord(nextRecord)
    })
    // 인증 사용자가 유지되는 보호 화면이므로 첫 렌더의 API 함수로 기록별 요청을 한 번만 만든다.
  }, [diaryRecord])

  useEffect(() => () => {
    window.clearTimeout(openTimerRef.current)
    window.clearTimeout(revealTimerRef.current)
  }, [])

  function openCookie() {
    if (isAnimating || isOpened) return

    setIsAnimating(true)
    openTimerRef.current = window.setTimeout(() => {
      setCookieSrc(COOKIE_IMAGE)
      const message = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]

      revealTimerRef.current = window.setTimeout(() => {
        setFortuneText(message)
        setIsOpened(true)
        setIsAnimating(false)
      }, 800)
    }, 1200)
  }

  function closeFortune() {
    window.clearTimeout(openTimerRef.current)
    window.clearTimeout(revealTimerRef.current)
    setShowFortune(false)
    setIsOpened(false)
    setIsAnimating(false)
    setFortuneText('')
    setCookieSrc(COOKIE_IMAGE)
  }

  return (
    <>
      <PageLayout
        title="조언"
        bodyClass="advice-page"
        hideBack
        hideRight
        mainClassName="advice-page"
        footer={<AppTabBar />}
      >
        {record ? (
          <>
            <section className="importance-content">
              <div className="button-content" aria-label="포춘쿠키">
                <button
                  type="button"
                  className="advice-fortune-btn"
                  onClick={() => setShowFortune(true)}
                >
                  <span>포춘쿠키를 확인하세요</span>
                </button>
              </div>
              <div className="text-content">
                <div className="text-group">
                  <p className="advice-hero__date">{dateLabel}</p>
                  <h2 className="advice-hero__headline">{headline}</h2>
                  <p className="advice-hero__score">
                    <span className="advice-hero__score-num">{score}</span>
                    <span className="advice-hero__score-unit">점</span>
                  </p>
                </div>
              </div>
            </section>

            <section className="card-content">
              {(colorText || tags.length > 0) && (
                <div className="card-item">
                  <p className="advice-color-card__text">{colorText}</p>
                  {tags.length > 0 && (
                    <div className="advice-tags">
                      {tags.map((tag) => (
                        <span key={tag} className="advice-tags__item"># {tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {adviceText && (
                <div className="card-item">
                  <h3>
                    <span className="icon01" />
                    AI 맞춤 조언
                  </h3>
                  <p className="advice-ai-body">{adviceText}</p>
                  {tips.map((tip) => (
                    <div key={tip.title} className="card-tips">
                      <h4>{adviceTipTitle(tip.title)}</h4>
                      <p>{tip.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <NoData
            title={'오늘의 감정을 기록하면\n맞춤 조언을 드려요!'}
            description="하루를 기록하고 AI의 따뜻한 조언을 받아보세요."
            buttonLabel="일기 쓰러가기"
          />
        )}
      </PageLayout>

      <ModalFull
        show={showFortune}
        modalClass="modal-fortune"
        bodyClass="body-fortune"
        onClose={closeFortune}
      >
        <h3 className="popup-fortune__tit">
          <img src="/assets/img/advice/popup-fortune-tit.png" alt="오늘의 운세" />
        </h3>
        <div className="fortune-cookie-block">
          <p className="text">
            바삭한 쿠키속에 숨겨진 <strong>당신의 행운</strong>을 확인해보세요!
          </p>
          <div className="fortune-glow" aria-hidden="true" />
          <div
            className="cookie-container"
            role="button"
            tabIndex={0}
            aria-label="포춘쿠키 열기"
            onClick={openCookie}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openCookie()
              }
            }}
          >
            {!isOpened && (
              <>
                <img
                  src={cookieSrc}
                  className={`cookie-img${isAnimating ? ' shaking' : ''}`}
                  alt="포춘쿠키"
                />
                <p className="text box">
                  쿠키를 눌러 오늘의<br />운세를 확인하세요
                </p>
              </>
            )}
            {isOpened && (
              <div className="fortune-text">
                <p>{fortuneText}</p>
              </div>
            )}
          </div>
        </div>
      </ModalFull>
    </>
  )
}

export default AdviceView
