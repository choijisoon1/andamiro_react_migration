import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import QueryError from '@/components/common/QueryError'
import AppTabBar from '@/components/layout/AppTabBar'
import ModalBottom from '@/components/layout/ModalBottom'
import PageLayout from '@/components/layout/PageLayout'
import { formatLocalDate } from '@/lib/date'
import { useDiariesByMonthQuery } from '@/queries/diaryQueries'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const EMOTION_KO = {
  best: '최고예요!',
  good: '좋아요!',
  normal: '보통이에요',
  bad: '별로예요',
  worst: '최악이에요',
}
const EMPTY_DIARIES = []

function dateString(year, month, day) {
  return [
    year,
    String(month + 1).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

function getSummary(record) {
  try {
    const parsed = JSON.parse(record.result ?? '')
    return parsed?.headline ?? parsed?.insight?.slice(0, 50) ?? ''
  } catch {
    return record.content?.slice(0, 50) ?? ''
  }
}

function formatTime(value) {
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function MainView() {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const userEmail = useAuthStore((state) => state.user?.email)
  const messages = useChatStore((state) => state.messages)
  const recordDate = useChatStore((state) => state.recordDate)
  const setRecordDate = useChatStore((state) => state.setRecordDate)
  const [today] = useState(() => new Date())
  const [calendarDate, setCalendarDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDay, setSelectedDay] = useState(null)
  const [resumeModalOpen, setResumeModalOpen] = useState(false)

  // 달력 UI 값은 이 화면에서만 사용하므로 전역 스토어가 아닌 React 로컬 상태로 유지한다.
  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthLabel = `${year}.${String(month + 1).padStart(2, '0')}`
  const nickname = profile?.nickname ?? userEmail?.split('@')[0] ?? '사용자'
  const todayString = formatLocalDate(today)

  const diariesQuery = useDiariesByMonthQuery(yearMonth)
  const diaries = diariesQuery.data ?? EMPTY_DIARIES
  const calendarLoading = diariesQuery.isFetching
  const calendarQueryFailed = diariesQuery.isError && diariesQuery.data === undefined

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const lastDate = new Date(year, month + 1, 0).getDate()
    return [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: lastDate }, (_, index) => index + 1),
    ]
  }, [month, year])

  const emotionMap = useMemo(() => {
    const map = {}
    diaries.forEach((diary) => {
      map[diary.record_date] = diary.emotion
    })
    return map
  }, [diaries])

  const selectedRecords = useMemo(() => {
    if (!selectedDay) return []
    const selectedDate = dateString(year, month, selectedDay)
    return diaries.filter((diary) => diary.record_date === selectedDate)
  }, [diaries, month, selectedDay, year])

  const selectedDayLabel = useMemo(() => {
    if (!selectedDay) return ''
    const selectedDate = new Date(`${dateString(year, month, selectedDay)}T12:00:00`)
    return `${month + 1}월 ${selectedDay}일 ${WEEK_LABELS[selectedDate.getDay()]}요일`
  }, [month, selectedDay, year])

  function emotionForDay(day) {
    return day ? (emotionMap[dateString(year, month, day)] ?? null) : null
  }

  function isToday(day) {
    return Boolean(day) && dateString(year, month, day) === todayString
  }

  function isFuture(day) {
    return Boolean(day) && dateString(year, month, day) > todayString
  }

  function selectDay(day) {
    if (!day || isFuture(day)) return
    setSelectedDay((currentDay) => currentDay === day ? null : day)
  }

  function goToRecord(record) {
    navigate(`/my/chat-view?id=${encodeURIComponent(record.id)}`)
  }

  function goToChat() {
    setRecordDate(selectedDay ? dateString(year, month, selectedDay) : null)
    navigate('/chat/emotion')
  }

  function hasTodayDraft() {
    return messages.length > 0 && (!recordDate || recordDate === todayString)
  }

  function goToTodayChat() {
    if (hasTodayDraft()) {
      setResumeModalOpen(true)
      return
    }

    setRecordDate(null)
    navigate('/chat/emotion')
  }

  function moveMonth(offset) {
    setCalendarDate((currentDate) => new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + offset,
      1,
    ))
    setSelectedDay(null)
  }

  return (
    <>
      <PageLayout
        className="main"
        title="안다미로"
        hideBack
        mainClassName="main-page"
        footer={<AppTabBar />}
      >
        <section className="main-hero">
          <div className="text-content">
            <div className="text-group">
              <span>{nickname}님, 오늘 하루는 어떠셨나요?</span>
              <em>지금 마음을 가볍게 남겨보세요!</em>
            </div>
            <div className="btn-content">
              <button type="button" className="btn-link" onClick={goToTodayChat}>
                오늘 기록 남기러 가기
              </button>
            </div>
          </div>
        </section>

        <section className="importance-content round calendar">
          {calendarQueryFailed ? (
            <QueryError
              title="달력 기록을 불러오지 못했어요"
              onRetry={() => diariesQuery.refetch()}
            />
          ) : (
            <div id="mainCalendarHost" className="calendar-grid__item" aria-label="월별 캘린더">
            <div className="dayflow-cal" role="application" aria-label="월별 달력">
              <div className="dayflow-cal__head">
                <button
                  type="button"
                  className="title-font-20 dayflow-cal__month-label"
                  aria-label="표시 중인 월"
                >
                  {monthLabel}
                </button>
                <div className="dayflow-cal__nav">
                  <button
                    type="button"
                    className="dayflow-cal__nav-btn btn--prev"
                    aria-label="이전 달"
                    onClick={() => moveMonth(-1)}
                  >
                    이전 달
                  </button>
                  <button
                    type="button"
                    className="dayflow-cal__nav-btn btn--next"
                    aria-label="다음 달"
                    onClick={() => moveMonth(1)}
                  >
                    다음 달
                  </button>
                </div>
              </div>

              <div className="dayflow-cal__dow">
                {WEEK_LABELS.map((label) => (
                  <span key={label} className="dayflow-cal__dow-cell">{label}</span>
                ))}
              </div>

              <div className={`dayflow-cal__grid${calendarLoading ? ' is-loading' : ''}`}>
                {calendarDays.map((day, index) => {
                  const emotion = emotionForDay(day)
                  const dayClasses = [
                    'dayflow-cal__day',
                    !day ? 'dayflow-cal__day--muted' : '',
                    isFuture(day) ? 'dayflow-cal__day--future' : '',
                    emotion ? `dayflow-cal__day--${emotion}` : '',
                    isToday(day) ? 'is-today' : '',
                    selectedDay === day && day ? 'is-selected' : '',
                  ].filter(Boolean).join(' ')

                  return (
                    <button
                      key={`${yearMonth}-${index}-${day ?? 'empty'}`}
                      type="button"
                      className={dayClasses}
                      disabled={!day || isFuture(day)}
                      aria-hidden={!day ? 'true' : undefined}
                      data-ymd={day ? dateString(year, month, day) : undefined}
                      onClick={() => selectDay(day)}
                    >
                      <span className="dayflow-cal__clover" aria-hidden="true" />
                      {day && <span className="dayflow-cal__num">{day}</span>}
                    </button>
                  )
                })}
              </div>

            </div>

            {selectedDay && (
              <>
                <hr />
                <div className="calendar-list">
                  <h3 className="title-font-16">
                    {selectedDayLabel}
                    <span>· {selectedRecords.length}개의 기록</span>
                  </h3>

                  {selectedRecords.length === 0 && (
                    <ul>
                      <li
                        className="calendar-list__empty calendar-list__empty--action"
                        role="button"
                        tabIndex={0}
                        onClick={goToChat}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') goToChat()
                        }}
                      >
                        아직 작성한 일기가 없어요.
                        <span className="calendar-list__empty-cta">일기쓰러가기</span>
                      </li>
                    </ul>
                  )}

                  {selectedRecords.length === 1 && (
                    <ul>
                      <li
                        role="button"
                        tabIndex={0}
                        onClick={() => goToRecord(selectedRecords[0])}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            goToRecord(selectedRecords[0])
                          }
                        }}
                      >
                        <p>
                          <em>{EMOTION_KO[selectedRecords[0].emotion]}</em>
                          <span className="calendar-list__summary">
                            {getSummary(selectedRecords[0]) || '이날의 기록을 함께 돌아봐요.'}
                          </span>
                        </p>
                      </li>
                    </ul>
                  )}

                  {selectedRecords.length > 1 && (
                    <ul>
                      {selectedRecords.map((record) => (
                        <li
                          key={record.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => goToRecord(record)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') goToRecord(record)
                          }}
                        >
                          <span className="calendar-list__time">{formatTime(record.created_at)}</span>
                          <strong className="calendar-list__name">{EMOTION_KO[record.emotion]}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
            </div>
          )}
        </section>
      </PageLayout>

      <ModalBottom
        show={resumeModalOpen}
        title="오늘 작성중인 기록이 있습니다"
        description="저장하지 않은 기록이 있어요. 이어서 작성할까요?"
        confirmLabel="작성중인 기록으로 이동"
        onClose={() => setResumeModalOpen(false)}
        onConfirm={() => {
          setResumeModalOpen(false)
          navigate('/chat')
        }}
      />
    </>
  )
}

export default MainView
