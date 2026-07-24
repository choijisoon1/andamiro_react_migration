import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ResultSkeleton from '@/components/common/ResultSkeleton'
import SvgGauge from '@/components/common/SvgGauge'
import FooterCtp from '@/components/layout/FooterCtp'
import ModalBottom from '@/components/layout/ModalBottom'
import PageLayout from '@/components/layout/PageLayout'
import { useAnalysisAgent } from '@/composables/useAnalysisAgent'
import { useSaveDiaryMutation } from '@/queries/diaryQueries'
import { useChatStore } from '@/stores/chatStore'

import './ResultView.scss'

const GAUGE_COLORS = {
  best: { from: '#FFE066', to: '#FF8C00' },
  good: { from: '#6ee7c0', to: '#059669' },
  normal: { from: '#b8d9ff', to: '#2f6feb' },
  bad: { from: '#d8b4fe', to: '#7c3aed' },
  worst: { from: '#fca5a5', to: '#dc2626' },
}

function createFallback(content) {
  return {
    score: 60,
    mood: '보통이에요',
    metrics: { 에너지: 60, 안정감: 60, 집중력: 60, 긍정성: 60 },
    insight: '오늘 하루도 수고하셨어요. 내일도 좋은 하루 되세요.',
    recommendations: [
      { title: '충분한 휴식', body: '오늘 하루를 돌아보며 쉬어가세요.' },
      { title: '가벼운 산책', body: '맑은 공기와 함께 내일을 준비해봐요.' },
    ],
    summary: content.slice(0, 100),
  }
}

function analysisSummary(analysis) {
  return JSON.stringify({
    score: analysis?.score,
    mood: analysis?.mood,
    headline: analysis?.headline,
    metrics: analysis?.metrics,
    insight: analysis?.insight,
    summary: analysis?.summary,
    recommendations: analysis?.recommendations,
    color: analysis?.color,
    tags: analysis?.tags,
    tips: analysis?.tips,
  })
}

function ResultView() {
  const navigate = useNavigate()
  const emotion = useChatStore((state) => state.emotion)
  const content = useChatStore((state) => state.content)
  const messages = useChatStore((state) => state.messages)
  const recordDate = useChatStore((state) => state.recordDate)
  const resetChat = useChatStore((state) => state.reset)
  const { analyze } = useAnalysisAgent()
  const saveDiary = useSaveDiaryMutation()
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState(null)
  const [gaugeScore, setGaugeScore] = useState(0)
  const [mainScore, setMainScore] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const analysisPromiseRef = useRef(null)
  const analyzeRef = useRef(analyze)
  const outerFrameRef = useRef(null)
  const innerFrameRef = useRef(null)
  const scoreFrameRef = useRef(null)

  const today = new Date().toISOString().split('T')[0]
  const date = recordDate ?? today
  const gaugeColors = GAUGE_COLORS[emotion] ?? GAUGE_COLORS.normal
  const title = analysis?.mood ?? ''
  const scores = useMemo(() => (
    analysis
      ? Object.entries(analysis.metrics ?? {}).map(([label, val]) => ({ label, val }))
      : []
  ), [analysis])
  const recommendations = analysis?.recommendations ?? []
  const displayInsight = analysis?.insight?.trim()
    || '오늘 하루도 수고하셨어요. 충분히 쉬고 내일도 좋은 하루 되세요.'
  const displaySummary = (analysis?.summary || content || '').trim()
    ? (analysis?.summary || content).trim().replace(/\s+/g, ' ')
    : '채팅 내용이 기록되지 않았어요.'

  function animateScore(target) {
    setGaugeScore(target)
    const duration = 1200
    const start = Date.now()

    function tick() {
      const progress = Math.min((Date.now() - start) / duration, 1)
      setMainScore(Math.round((1 - Math.pow(1 - progress, 3)) * target))
      if (progress < 1) scoreFrameRef.current = window.requestAnimationFrame(tick)
    }

    scoreFrameRef.current = window.requestAnimationFrame(tick)
  }

  useEffect(() => {
    // 개발 모드의 effect 재실행에서도 AI 분석 요청은 하나만 공유한다.
    if (!analysisPromiseRef.current) {
      analysisPromiseRef.current = analyzeRef.current(emotion, messages).catch((error) => {
        console.warn('[result] analyze failed → fallback:', error?.message ?? error)
        return createFallback(content)
      })
    }

    let cancelled = false
    analysisPromiseRef.current.then((result) => {
      if (cancelled) return
      setAnalysis(result)
      setLoading(false)
      outerFrameRef.current = window.requestAnimationFrame(() => {
        innerFrameRef.current = window.requestAnimationFrame(() => {
          animateScore(Number(result?.score) || 0)
        })
      })
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(outerFrameRef.current)
      window.cancelAnimationFrame(innerFrameRef.current)
      window.cancelAnimationFrame(scoreFrameRef.current)
    }
    // 결과 화면에 들어온 시점의 Zustand 스냅샷으로 한 번만 분석한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveAndGo(to, state = {}) {
    setSaving(true)
    setSaveError('')

    try {
      await saveDiary.mutateAsync({
        date,
        emotion,
        content,
        chat_messages: messages,
        summary: analysisSummary(analysis),
      })
      resetChat()
      navigate(to, { state })
    } catch (error) {
      console.error('[save error]', error)
      setSaveError(error?.message || error?.code || JSON.stringify(error) || '저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  function goExchange() {
    setShowExchangeModal(true)
  }

  async function confirmExchange() {
    setShowExchangeModal(false)
    await saveAndGo(
      '/exchange/write?source=ai',
      { summary: analysis?.summary ?? content },
    )
  }

  return (
    <>
      <PageLayout
        title="오늘의 일기분석"
        hideBack
        hideRight
        mainClassName="result-main"
        footer={(
          <FooterCtp
            secondaryLabel="공유일기 작성"
            label={saving ? '저장 중…' : '홈으로'}
            disabled={loading || saving}
            secondaryDisabled={loading || saving}
            onSecondaryClick={goExchange}
            onClick={() => saveAndGo('/main')}
          />
        )}
      >
        {loading ? (
          <ResultSkeleton />
        ) : (
          <>
            <section className="importance-content">
              <div
                className="grap-content"
                style={{
                  '--result-gauge-from': gaugeColors.from,
                  '--result-gauge-to': gaugeColors.to,
                }}
              >
                <h3>
                  <span>데일리 채팅 분석</span>
                  <em>오늘의 감정 점수</em>
                </h3>
                <div className="grap-group score-chart">
                  <SvgGauge
                    score={gaugeScore}
                    colorFrom={gaugeColors.from}
                    colorTo={gaugeColors.to}
                  />
                  <div className="gauge-center">
                    <p className="gauge-title">{title}</p>
                    <p className="gauge-score">{mainScore}</p>
                    <p className="gauge-label">SCORE</p>
                  </div>
                </div>
                <div className="grap-group score-list">
                  {scores.map((item) => (
                    <div key={item.label} className="score-item">
                      <span className="score-item__val">{item.val}</span>
                      <div className="score-item__bar">
                        <div className="score-item__fill" style={{ width: `${item.val}%` }} />
                      </div>
                      <span className="score-item__label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="card-content">
              <div className="card-item">
                <h3>
                  <span className="icon01" />
                  오늘은 이렇게 보내고 계시는군요!
                </h3>
                <p className="result-insights">{displayInsight}</p>
                <div className="card-tips">
                  <h4>채팅 요약</h4>
                  <p>{displaySummary}</p>
                </div>
              </div>
              <div className="card-item">
                <h3>
                  <span className="icon02" />
                  내일은 이렇게 준비해보세요!
                </h3>
                <ol className="card-ol-list">
                  {recommendations.map((recommendation, index) => (
                    <li key={`${recommendation.title}-${index}`} className="result-reco">
                      <em>{recommendation.title}</em>
                      <p>{recommendation.body}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {saveError && <p className="result-error" role="alert">{saveError}</p>}
          </>
        )}
      </PageLayout>

      <ModalBottom
        show={showExchangeModal}
        title="공유일기로 작성할까요?"
        description="오늘의 감정을 친구와 나눠보세요."
        cancelLabel="다음에 하기"
        confirmLabel="작성하기"
        onClose={() => setShowExchangeModal(false)}
        onConfirm={confirmExchange}
      />
    </>
  )
}

export default ResultView
