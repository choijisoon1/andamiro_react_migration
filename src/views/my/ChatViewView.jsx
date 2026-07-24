import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import SvgGauge from '@/components/common/SvgGauge'
import FooterCtp from '@/components/layout/FooterCtp'
import PageLayout from '@/components/layout/PageLayout'
import {
  useDiaryByDateQuery,
  useDiaryByIdQuery,
} from '@/queries/diaryQueries'

import './ChatViewView.scss'

const EMOTION_KO = {
  best: '최고예요!',
  good: '좋아요!',
  normal: '보통이에요',
  bad: '별로예요',
  worst: '최악이에요',
}

const GAUGE_COLORS = {
  best: { from: '#FFE066', to: '#FF8C00' },
  good: { from: '#6ee7c0', to: '#059669' },
  normal: { from: '#b8d9ff', to: '#2f6feb' },
  bad: { from: '#d8b4fe', to: '#7c3aed' },
  worst: { from: '#fca5a5', to: '#dc2626' },
}

function parseStored(raw, contentFallback) {
  if (raw == null || raw === '') return {}
  if (typeof raw === 'object') return raw

  try {
    return JSON.parse(raw)
  } catch {
    return { insight: String(raw), summary: contentFallback ?? '' }
  }
}

function createAnalysis(record) {
  if (!record) return null

  const parsed = parseStored(record.result, record.content)
  const emotion = record.emotion ?? 'normal'
  const score = typeof parsed.score === 'number' && !Number.isNaN(parsed.score)
    ? parsed.score
    : null
  let metrics = parsed.metrics && typeof parsed.metrics === 'object'
    ? { ...parsed.metrics }
    : null

  if (score != null && !metrics) {
    metrics = {
      에너지: score,
      안정감: score,
      집중력: score,
      긍정성: score,
    }
  }

  return {
    mood: parsed.mood || parsed.headline || EMOTION_KO[emotion] || '기록',
    score,
    metrics,
    insight: parsed.insight || '',
    summary: parsed.summary || (record.content ?? '').slice(0, 500),
  }
}

function ChatViewView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryValue = searchParams.get('id') ?? searchParams.get('date') ?? ''
  const isUuid = /^[0-9a-f-]{36}$/i.test(queryValue)

  // Vue의 id/date 조회 순서를 유지하되 Supabase 서버 데이터는 TanStack Query가 관리한다.
  const idQuery = useDiaryByIdQuery(isUuid ? queryValue : '')
  const dateQuery = useDiaryByDateQuery(queryValue && !isUuid ? queryValue : '')
  const activeQuery = isUuid ? idQuery : dateQuery
  const record = activeQuery.data ?? null
  const analysis = useMemo(() => createAnalysis(record), [record])
  const [gaugeScore, setGaugeScore] = useState(0)
  const [mainScore, setMainScore] = useState(0)

  const gaugeColors = GAUGE_COLORS[record?.emotion] ?? GAUGE_COLORS.normal
  const showGauge = analysis?.score != null
  const scores = analysis?.metrics ? Object.entries(analysis.metrics) : []

  useEffect(() => {
    if (!queryValue) {
      navigate('/main', { replace: true })
      return
    }

    if (!activeQuery.isLoading && !activeQuery.isFetching && !record) {
      navigate('/main', { replace: true })
    }
  }, [
    activeQuery.isFetching,
    activeQuery.isLoading,
    navigate,
    queryValue,
    record,
  ])

  useEffect(() => {
    let gaugeFrame = 0
    let startFrame = 0
    let countFrame = 0

    if (!showGauge) {
      return undefined
    }

    const target = analysis.score

    // Vue ECharts와 같은 1.2초 cubic-out 증가 효과를 SVG 게이지에도 적용한다.
    gaugeFrame = requestAnimationFrame(() => {
      setGaugeScore(0)
      setMainScore(0)
      startFrame = requestAnimationFrame(() => setGaugeScore(target))

      const startedAt = Date.now()
      const tick = () => {
        const progress = Math.min((Date.now() - startedAt) / 1200, 1)
        setMainScore(Math.round((1 - Math.pow(1 - progress, 3)) * target))
        if (progress < 1) countFrame = requestAnimationFrame(tick)
      }
      countFrame = requestAnimationFrame(tick)
    })

    return () => {
      cancelAnimationFrame(gaugeFrame)
      cancelAnimationFrame(startFrame)
      cancelAnimationFrame(countFrame)
    }
  }, [analysis?.score, record?.id, showGauge])

  return (
    <PageLayout
      title="일기 분석"
      backTo="/main"
      mainClassName="result-main saved-diary-view"
      footer={<FooterCtp label="홈으로" onClick={() => navigate('/main')} />}
    >
      {activeQuery.isLoading && (
        <div className="result-loading">
          <div className="result-loading__dots">
            <span />
            <span />
            <span />
          </div>
          <p>기록을 불러오는 중이에요…</p>
        </div>
      )}

      {!activeQuery.isLoading && analysis && (
        <>
          <section className="importance-content">
            <div className="text-content">
              <div className="text-group">
                <span>저장된 분석</span>
                <em>{showGauge ? '이날의 감정 점수' : '이날의 기록'}</em>
              </div>
            </div>

            {showGauge && (
              <div
                className="grap-content"
                style={{
                  '--saved-gauge-from': gaugeColors.from,
                  '--saved-gauge-to': gaugeColors.to,
                }}
              >
                <div className="grap-group score-chart">
                  <SvgGauge
                    score={gaugeScore}
                    colorFrom={gaugeColors.from}
                    colorTo={gaugeColors.to}
                  />
                  <div className="gauge-center">
                    <p className="gauge-title">{analysis.mood}</p>
                    <p className="gauge-score">{mainScore}</p>
                    <p className="gauge-label">SCORE</p>
                  </div>
                </div>

                {scores.length > 0 && (
                  <div className="grap-group score-list">
                    {scores.map(([label, value]) => (
                      <div key={label} className="score-item">
                        <span className="score-item__val">{value}</span>
                        <div className="score-item__bar">
                          <div
                            className="score-item__fill"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="score-item__label">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="card-content">
            <div className="card-item">
              <h3>
                <span className="icon01" />
                그날은 이렇게 보내고 있었네요!
              </h3>
              <p className="result-insights">
                {analysis.insight || '이날의 감정 기록을 되돌아봐요.'}
              </p>
              <div className="card-tips">
                <h4>채팅 요약</h4>
                <p>{analysis.summary}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </PageLayout>
  )
}

export default ChatViewView
