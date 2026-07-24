import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteDiaries,
  fetchAllDiaries,
  fetchDiariesByMonth,
  fetchDiaryByDate,
  fetchDiaryById,
  fetchDiaryStats,
  saveDiary,
  updateDiaryResult,
} from '@/api/diaryApi'
import { useAuthStore } from '@/stores/authStore'

// 서버 응답은 Zustand에 복사하지 않고 userId별 Query Key로 캐시한다.
// mutation 성공 시 해당 사용자의 일기 Query를 무효화해 최신 Supabase 데이터를 다시 받는다.
export const diaryKeys = {
  all: ['diary'],
  user: (userId) => [...diaryKeys.all, userId],
  backup: (userId) => [...diaryKeys.user(userId), 'backup'],
  month: (userId, yearMonth) => [...diaryKeys.user(userId), 'month', yearMonth],
  detail: (userId, id) => [...diaryKeys.user(userId), 'detail', id],
  date: (userId, date) => [...diaryKeys.user(userId), 'date', date],
  stats: (userId) => [...diaryKeys.user(userId), 'stats'],
}

export function useDiaryBackupQuery() {
  const userId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: diaryKeys.backup(userId),
    queryFn: () => fetchAllDiaries({ userId }),
    enabled: Boolean(userId),
  })
}

export function useDiariesByMonthQuery(yearMonth) {
  const userId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: diaryKeys.month(userId, yearMonth),
    queryFn: () => fetchDiariesByMonth({ userId, yearMonth }),
    enabled: Boolean(userId && yearMonth),
  })
}

export function useDiaryByIdQuery(id) {
  const userId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: diaryKeys.detail(userId, id),
    queryFn: () => fetchDiaryById({ userId, id }),
    enabled: Boolean(userId && id),
  })
}

export function useDiaryByDateQuery(date) {
  const userId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: diaryKeys.date(userId, date),
    queryFn: () => fetchDiaryByDate({ userId, date }),
    enabled: Boolean(userId && date),
  })
}

export function useDiaryStatsQuery() {
  const userId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: diaryKeys.stats(userId),
    queryFn: () => fetchDiaryStats({ userId }),
    enabled: Boolean(userId),
  })
}

export function useSaveDiaryMutation() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)

  return useMutation({
    mutationFn: (payload) => saveDiary({ userId, payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: diaryKeys.user(userId) }),
  })
}

export function useUpdateDiaryResultMutation() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)

  return useMutation({
    mutationFn: ({ id, result }) => updateDiaryResult({ userId, id, result }),
    onSuccess: (diary) => {
      queryClient.setQueryData(diaryKeys.detail(userId, diary.id), diary)
      queryClient.invalidateQueries({ queryKey: diaryKeys.user(userId) })
    },
  })
}

export function useDeleteDiariesMutation() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)

  return useMutation({
    mutationFn: (ids) => deleteDiaries({ userId, ids }),
    onSuccess: (deletedIds) => {
      const deletedIdSet = new Set(deletedIds)

      // Vue가 로컬 배열에서 즉시 제거하던 동작을 Query 캐시에 같은 순서로 반영한다.
      queryClient.setQueryData(
        diaryKeys.backup(userId),
        (diaries = []) => diaries.filter((diary) => !deletedIdSet.has(diary.id)),
      )
      queryClient.invalidateQueries({ queryKey: diaryKeys.user(userId) })
    },
  })
}
