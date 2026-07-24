import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import LoadingSkeleton from '@/components/common/LoadingSkeleton'
import NoData from '@/components/common/NoData'
import FooterCtp from '@/components/layout/FooterCtp'
import PageLayout from '@/components/layout/PageLayout'
import {
  useDeleteDiariesMutation,
  useDiaryBackupQuery,
} from '@/queries/diaryQueries'
import { useAuthStore } from '@/stores/authStore'

import './DataBack.scss'

const PAGE_SIZE = 15
const EMPTY_DIARIES = []
const VALID_EMOTIONS = ['best', 'good', 'normal', 'bad', 'worst']

function formatPostDate(dateValue) {
  if (!dateValue) return ''

  const target = String(dateValue).includes('T')
    ? new Date(dateValue)
    : new Date(`${dateValue}T12:00:00`)
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffDays = Math.floor(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays <= 0) return '오늘'
  if (diffDays <= 5) return `${diffDays}일전`

  const year = target.getFullYear()
  const month = String(target.getMonth() + 1).padStart(2, '0')
  const day = String(target.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

function formatFileDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emotionIconSrc(emotion) {
  return VALID_EMOTIONS.includes(emotion)
    ? `/assets/img/emotion/ico-${emotion}.png`
    : '/assets/img/emotion/img-none.png'
}

function emotionBackground(emotion) {
  const backgroundName = VALID_EMOTIONS.includes(emotion) ? emotion : 'normal'
  return {
    backgroundImage: `url(/assets/img/emotion/bg-${backgroundName}.png)`,
  }
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function createCsv(diaries) {
  const headers = [
    ['record_date', '기록일'],
    ['emotion', '감정'],
    ['content', '내용'],
    ['result', '분석 결과'],
    ['chat_messages', '채팅 기록'],
    ['created_at', '작성일'],
  ]
  const headerRow = headers.map(([, label]) => escapeCsvValue(label)).join(',')
  const rows = diaries.map((diary) => (
    headers.map(([key]) => escapeCsvValue(diary[key])).join(',')
  ))

  return [headerRow, ...rows].join('\n')
}

function DataBack() {
  const navigate = useNavigate()
  const authLoading = useAuthStore((state) => state.loading)
  const { data: diaries = EMPTY_DIARIES, isPending } = useDiaryBackupQuery()
  const deleteDiaries = useDeleteDiariesMutation()
  const [downloading, setDownloading] = useState(false)
  const [viewState, setViewState] = useState({
    diaries,
    visibleCount: PAGE_SIZE,
    selectedIds: new Set(),
  })

  if (viewState.diaries !== diaries) {
    const nextIds = new Set(diaries.map((diary) => diary.id))
    setViewState({
      diaries,
      visibleCount: PAGE_SIZE,
      selectedIds: new Set(
        [...viewState.selectedIds].filter((id) => nextIds.has(id)),
      ),
    })
  }

  const selectedIds = viewState.selectedIds
  const visibleCount = viewState.visibleCount
  const visibleDiaries = diaries.slice(0, visibleCount)
  const hasMoreItems = visibleCount < diaries.length
  const currentPage = Math.ceil(visibleCount / PAGE_SIZE)
  const totalPages = Math.ceil(diaries.length / PAGE_SIZE)
  const selectedCount = selectedIds.size
  const isAllSelected = diaries.length > 0
    && diaries.every((diary) => selectedIds.has(diary.id))
  const actionLabel = isAllSelected ? '해제' : '전체선택'
  const deleting = deleteDiaries.isPending
  const isLoading = authLoading || isPending

  function toggleSelect(id) {
    setViewState((current) => {
      const nextSelectedIds = new Set(current.selectedIds)
      if (nextSelectedIds.has(id)) nextSelectedIds.delete(id)
      else nextSelectedIds.add(id)
      return { ...current, selectedIds: nextSelectedIds }
    })
  }

  function toggleSelectAll() {
    setViewState((current) => ({
      ...current,
      selectedIds: isAllSelected
        ? new Set()
        : new Set(diaries.map((diary) => diary.id)),
    }))
  }

  function showMore() {
    setViewState((current) => ({
      ...current,
      visibleCount: Math.min(current.visibleCount + PAGE_SIZE, diaries.length),
    }))
  }

  function downloadSelected() {
    if (downloading || selectedIds.size === 0) return
    setDownloading(true)

    try {
      const selectedDiaries = diaries.filter((diary) => selectedIds.has(diary.id))
      const blob = new Blob([`\uFEFF${createCsv(selectedDiaries)}`], {
        type: 'text/csv;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `diary-backup-${formatFileDate()}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function deleteSelected() {
    if (deleting || selectedIds.size === 0) return
    if (!window.confirm('선택한 데이터를 삭제할까요? 삭제한 데이터는 복구할 수 없어요.')) {
      return
    }

    try {
      await deleteDiaries.mutateAsync([...selectedIds])
      setViewState((current) => ({ ...current, selectedIds: new Set() }))
    } catch (error) {
      console.error('일기 백업 데이터 삭제 실패:', error)
    }
  }

  const footer = diaries.length > 0 ? (
    <FooterCtp
      label={downloading ? '다운로드 중…' : '다운로드하기'}
      disabled={downloading || deleting || selectedCount === 0}
      secondaryLabel={deleting ? '삭제 중…' : '데이터 삭제'}
      secondaryDisabled={deleting || downloading || selectedCount === 0}
      onClick={downloadSelected}
      onSecondaryClick={deleteSelected}
    />
  ) : (
    <FooterCtp label="홈으로" onClick={() => navigate('/main')} />
  )

  return (
    <PageLayout
      title="데이터 백업"
      backTo="/my"
      actionLabel={actionLabel}
      onAction={toggleSelectAll}
      mainClassName="list-body databack-page"
      footer={footer}
    >
      <section className="list-content">
        {isLoading ? (
          <LoadingSkeleton type="exchange-list" count={3} />
        ) : diaries.length === 0 ? (
          <NoData
            title="백업할 데이터가 없어요"
            description="작성한 일기가 생기면<br/> 이곳에서 백업할 수 있어요."
          />
        ) : (
          <ul>
            {visibleDiaries.map((diary) => {
              const selected = selectedIds.has(diary.id)

              return (
                <li
                  key={diary.id}
                  className={`exch-item${selected ? ' is-selected' : ''}`}
                  onClick={() => toggleSelect(diary.id)}
                >
                  <p className="thumb-box" style={emotionBackground(diary.emotion)}>
                    <img
                      src={emotionIconSrc(diary.emotion)}
                      className="item__thumb"
                      alt={diary.emotion || '감정'}
                    />
                  </p>
                  <div className="list-box">
                    <p className="title">{diary.content || '기록된 일기'}</p>
                    <p className="sub-text">
                      <span className="date">
                        {formatPostDate(diary.record_date || diary.created_at)}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`button-check${selected ? ' is-selected' : ''}`}
                    aria-pressed={selected}
                    aria-label="백업 항목 선택"
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleSelect(diary.id)
                    }}
                  />
                </li>
              )
            })}
          </ul>
        )}

        {hasMoreItems && (
          <div className="btn-content">
            <button type="button" className="btn-more" onClick={showMore}>
              <p>
                더보기
                <span>
                  (<em>{currentPage}</em>/<span>{totalPages}</span>)
                </span>
              </p>
            </button>
          </div>
        )}
      </section>
    </PageLayout>
  )
}

export default DataBack
