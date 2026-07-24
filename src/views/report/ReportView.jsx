import { useMemo, useState } from 'react'

import EChart from '@/components/common/EChart'
import LoadingSkeleton from '@/components/common/LoadingSkeleton'
import NoData from '@/components/common/NoData'
import QueryError from '@/components/common/QueryError'
import AppTabBar from '@/components/layout/AppTabBar'
import PageLayout from '@/components/layout/PageLayout'
import { useDiariesByMonthQuery } from '@/queries/diaryQueries'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const SCORE_BY_EMOTION = { best: 92, good: 72, normal: 58, bad: 42, worst: 28 }
const EMOTION_KO = {
  best: '최고예요',
  good: '좋아요',
  normal: '보통이에요',
  bad: '별로예요',
  worst: '최악이에요',
}
const VALID_EMOTIONS = new Set(['best', 'good', 'normal', 'bad', 'worst'])
const EMPTY_DIARIES = []
const BAR_COLORS = [
  '#79AAFF',
  '#A2C4FF',
  '#C8DCFF',
  '#C8DCFF',
  '#E6EFFF',
  '#C8DCFF',
  '#A2C4FF',
]
const BUBBLE_CENTERS = [[29, 46], [63, 34], [53, 74], [24, 79], [79, 63]]

function getWeekdayEnergy(diaries) {
  const buckets = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }))

  diaries.forEach((diary) => {
    const day = new Date(`${diary.record_date}T12:00:00`).getDay()
    buckets[day].sum += SCORE_BY_EMOTION[diary.emotion] ?? 58
    buckets[day].count += 1
  })

  return buckets.map((bucket) => (
    bucket.count ? Math.round(bucket.sum / bucket.count) : 0
  ))
}

function getEmotionRanking(diaries) {
  const counts = {}

  diaries.forEach((diary) => {
    if (VALID_EMOTIONS.has(diary.emotion)) {
      counts[diary.emotion] = (counts[diary.emotion] ?? 0) + 1
    }
  })

  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([emotion, count]) => ({ emotion, count, name: EMOTION_KO[emotion] }))
}

function getInsights(ranking, energy) {
  const insights = []
  const nonZeroEnergy = energy
    .map((value, index) => ({ value, index }))
    .filter((item) => item.value > 0)

  if (ranking.length > 0) {
    insights.push(
      `이번 달 베이스 감정은 '${ranking[0].name}'으로 ${ranking[0].count}번 기록됐어요.`,
    )
  }

  if (nonZeroEnergy.length >= 2) {
    const maxDay = nonZeroEnergy.reduce((left, right) => (
      left.value > right.value ? left : right
    ))
    const minDay = nonZeroEnergy.reduce((left, right) => (
      left.value < right.value ? left : right
    ))

    if (maxDay.index !== minDay.index) {
      insights.push(
        `${DAYS[maxDay.index]}요일에 에너지가 높고 ${DAYS[minDay.index]}요일에 낮아지는 패턴이 보여요.`,
      )
    }
  }

  const negativeRanking = ranking.filter(({ emotion }) => (
    emotion === 'bad' || emotion === 'worst'
  ))

  if (negativeRanking.length > 0) {
    const negativeCount = negativeRanking.reduce((sum, item) => sum + item.count, 0)
    insights.push(`부정적 감정이 ${negativeCount}번 기록됐어요. 충분한 휴식을 챙겨봐요.`)
  } else if (ranking.length >= 2) {
    insights.push(`'${ranking[0].name}'이 베이스 감정으로, 안정적인 흐름을 유지하고 있어요.`)
  }

  return insights
}

function getBubbleItems(ranking) {
  if (ranking.length === 0) return []

  const maxCount = ranking[0].count
  return ranking.map((item, index) => {
    const size = Math.round((item.count / maxCount) * 80 + 75)
    const [centerX, centerY] = BUBBLE_CENTERS[index] ?? [50, 50]

    return {
      ...item,
      style: {
        left: `calc(${centerX}% - ${size / 2}px)`,
        top: `calc(${centerY}% - ${size / 2}px)`,
        width: `${size}px`,
        height: `${size}px`,
        '--enter-delay': `${index * 200}ms`,
      },
    }
  })
}

function ReportView() {
  const [now] = useState(() => new Date())
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = `${now.getMonth() + 1}월`
  const diariesQuery = useDiariesByMonthQuery(yearMonth)
  const diaries = diariesQuery.data ?? EMPTY_DIARIES

  // Supabase 원본을 별도 전역 상태에 복사하지 않고 화면용 파생값만 계산한다.
  const weekdayEnergy = useMemo(() => getWeekdayEnergy(diaries), [diaries])
  const emotionRanking = useMemo(() => getEmotionRanking(diaries), [diaries])
  const insights = useMemo(
    () => getInsights(emotionRanking, weekdayEnergy),
    [emotionRanking, weekdayEnergy],
  )
  const bubbleItems = useMemo(() => getBubbleItems(emotionRanking), [emotionRanking])
  const barOption = useMemo(() => ({
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    grid: { left: 0, right: 0, top: 8, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: DAYS,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#999',
        fontSize: 12,
        fontFamily: 'Pretendard, sans-serif',
      },
    },
    yAxis: { show: false, max: 100 },
    series: [{
      type: 'bar',
      data: weekdayEnergy,
      barWidth: '70%',
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: ({ dataIndex }) => BAR_COLORS[dataIndex],
      },
    }],
  }), [weekdayEnergy])

  return (
    <PageLayout
      title="리포트"
      hideBack
      hideRight
      mainClassName="report-main"
      footer={<AppTabBar />}
    >
      {diariesQuery.isPending ? (
        <LoadingSkeleton type="result" count={1} />
      ) : diariesQuery.isError && diariesQuery.data === undefined ? (
        <QueryError
          title="리포트를 불러오지 못했어요"
          onRetry={() => diariesQuery.refetch()}
        />
      ) : diaries.length > 0 ? (
        <>
          <section className="report-hero">
            <div className="text-content">
              <div className="text-group">
                <p className="tit">
                  <span>{monthLabel}의 감정은 어땠을까요?</span>
                  <em>한 달의 마음 흐름을 돌아보세요!</em>
                </p>
              </div>
            </div>
          </section>

          <section className="importance-content round">
            <div className="report-panel">
              <div className="text-content">
                <div className="text-group">
                  <p className="text-sub">이번 달 요일별 평균</p>
                  <h2>요일별 에너지</h2>
                </div>
              </div>
              <EChart
                className="report-bar-chart"
                option={barOption}
                ariaLabel="요일별 평균 에너지 막대 차트"
              />
            </div>
            <hr />

            <div className="report-panel">
              <div className="text-content">
                <div className="text-group">
                  <p className="text-sub">감정 리포트</p>
                  <h2>이번달 감정 순위</h2>
                </div>
              </div>
              <div className="report-bubble-wrap">
                {bubbleItems.length > 0 ? bubbleItems.map((item, index) => (
                  <div
                    key={item.emotion}
                    className={`r-bubble r-bubble--${index}`}
                    style={item.style}
                  >
                    <span className="r-bubble__name">{item.name}</span>
                    <span className="r-bubble__count">{item.count}일</span>
                  </div>
                )) : (
                  <p className="report-empty">감정을 선택해 기록하면 순위가 보여요.</p>
                )}
              </div>
            </div>
          </section>

          <section className="card-content">
            <div className="card-item report-insight-card">
              <h3>
                <span className="icon01" />
                패턴 인사이트
              </h3>
              {insights.length > 0 ? (
                <ul className="insight-list">
                  {insights.map((insight) => (
                    <li key={insight} className="insight-item">
                      <span className="insight-item__avatar" />
                      <p>{insight}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="report-empty">기록이 쌓이면 패턴을 분석해드려요.</p>
              )}
            </div>
          </section>
        </>
      ) : (
        <NoData buttonLabel="일기 쓰러가기" />
      )}
    </PageLayout>
  )
}

export default ReportView
