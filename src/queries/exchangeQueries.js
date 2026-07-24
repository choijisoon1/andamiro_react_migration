import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  acceptExchangeInvitation,
  createExchangeComment,
  createExchangePost,
  deleteExchangeComment,
  deleteExchangePost,
  fetchExchangeComments,
  fetchExchangeInvitation,
  fetchExchangeInvitationPreview,
  fetchExchangePost,
  fetchExchangePosts,
  fetchMyExchangeCount,
  joinExchangeByCode,
  regenerateExchangeInvitation,
  sendExchangeCommentPush,
} from '@/api/exchangeApi'
import { useAuthStore } from '@/stores/authStore'

// 교환일기 서버 상태는 사용자별 Query Key로 분리해 다른 계정의 캐시와 섞이지 않게 한다.
export const exchangeKeys = {
  all: ['exchange'],
  user: (userId) => [...exchangeKeys.all, userId],
  postsRoot: (userId) => [...exchangeKeys.user(userId), 'posts'],
  posts: (userId, filter) => [...exchangeKeys.postsRoot(userId), filter],
  detail: (userId, id) => [...exchangeKeys.user(userId), 'detail', id],
  comments: (userId, postId) => [...exchangeKeys.user(userId), 'comments', postId],
  count: (userId) => [...exchangeKeys.user(userId), 'count'],
  invitation: (userId, postId) => [
    ...exchangeKeys.user(userId),
    'invitation',
    postId,
  ],
  invitationPreview: (userId, token) => [
    ...exchangeKeys.user(userId),
    'invitation-preview',
    token,
  ],
}

export function useExchangePostsQuery(filter = 'all') {
  const userId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: exchangeKeys.posts(userId, filter),
    queryFn: () => fetchExchangePosts({ userId, filter }),
    enabled: Boolean(userId),
  })
}

export function useMyExchangeCountQuery() {
  const userId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: exchangeKeys.count(userId),
    queryFn: () => fetchMyExchangeCount({ userId }),
    enabled: Boolean(userId),
  })
}

export function useExchangePostQuery(id) {
  const userId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: exchangeKeys.detail(userId, id),
    queryFn: () => fetchExchangePost({ id }),
    enabled: Boolean(userId && id),
  })
}

export function useExchangeCommentsQuery(postId) {
  const userId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: exchangeKeys.comments(userId, postId),
    queryFn: () => fetchExchangeComments({ postId }),
    enabled: Boolean(userId && postId),
  })
}

export function useExchangeInvitationQuery(postId, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: exchangeKeys.invitation(userId, postId),
    queryFn: () => fetchExchangeInvitation({ postId }),
    // 초대 정보는 방 소유자에게만 필요하므로 상세 화면에서 조회 여부를 정한다.
    enabled: Boolean(userId && postId && enabled),
  })
}

export function useExchangeInvitationPreviewQuery(token) {
  const userId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: exchangeKeys.invitationPreview(userId, token),
    queryFn: () => fetchExchangeInvitationPreview({ token }),
    enabled: Boolean(userId && token),
  })
}

export function useCreateExchangePostMutation() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)

  return useMutation({
    mutationFn: (payload) => createExchangePost({ userId, payload }),
    onSuccess: (post) => {
      queryClient.setQueryData(exchangeKeys.detail(userId, post.id), post)
      queryClient.invalidateQueries({ queryKey: exchangeKeys.postsRoot(userId) })
      queryClient.invalidateQueries({ queryKey: exchangeKeys.count(userId) })
    },
  })
}

export function useRegenerateExchangeInvitationMutation(postId) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)

  return useMutation({
    mutationFn: () => regenerateExchangeInvitation({ postId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: exchangeKeys.invitation(userId, postId),
      })
    },
  })
}

function useJoinSuccessInvalidation() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)

  return () => {
    queryClient.invalidateQueries({ queryKey: exchangeKeys.postsRoot(userId) })
    queryClient.invalidateQueries({ queryKey: exchangeKeys.count(userId) })
  }
}

export function useJoinExchangeByCodeMutation() {
  const invalidateJoinedPosts = useJoinSuccessInvalidation()

  return useMutation({
    mutationFn: (code) => joinExchangeByCode({ code }),
    onSuccess: (postId) => {
      if (postId) invalidateJoinedPosts()
    },
  })
}

export function useAcceptExchangeInvitationMutation() {
  const invalidateJoinedPosts = useJoinSuccessInvalidation()

  return useMutation({
    mutationFn: ({ token, password }) => (
      acceptExchangeInvitation({ token, password })
    ),
    onSuccess: (postId) => {
      if (postId) invalidateJoinedPosts()
    },
  })
}

export function useCreateExchangeCommentMutation(postId) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)

  return useMutation({
    mutationFn: (content) => createExchangeComment({ userId, postId, content }),
    onSuccess: (comment) => {
      // Pinia 배열에 직접 추가하던 동작을 사용자별 Query 캐시 갱신으로 대체한다.
      queryClient.setQueryData(
        exchangeKeys.comments(userId, postId),
        (comments = []) => [...comments, comment],
      )
      queryClient.invalidateQueries({
        queryKey: exchangeKeys.detail(userId, postId),
      })
      queryClient.invalidateQueries({ queryKey: exchangeKeys.postsRoot(userId) })
    },
  })
}

export function useDeleteExchangeCommentMutation(postId) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)

  return useMutation({
    mutationFn: (commentId) => (
      deleteExchangeComment({ userId, commentId })
    ),
    onSuccess: (_, deletedCommentId) => {
      queryClient.setQueryData(
        exchangeKeys.comments(userId, postId),
        (comments = []) => comments.filter(
          (comment) => String(comment.id) !== String(deletedCommentId),
        ),
      )
      queryClient.invalidateQueries({
        queryKey: exchangeKeys.detail(userId, postId),
      })
      queryClient.invalidateQueries({ queryKey: exchangeKeys.postsRoot(userId) })
    },
  })
}

export function useSendExchangeCommentPushMutation() {
  return useMutation({
    mutationFn: (postId) => sendExchangeCommentPush({ postId }),
  })
}

export function useDeleteExchangePostMutation() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)

  return useMutation({
    mutationFn: (id) => deleteExchangePost({ userId, id }),
    onSuccess: (_, deletedId) => {
      queryClient.setQueriesData(
        { queryKey: exchangeKeys.postsRoot(userId) },
        (posts) => posts?.filter((post) => post.id !== deletedId),
      )
      queryClient.removeQueries({
        queryKey: exchangeKeys.detail(userId, deletedId),
      })
      queryClient.invalidateQueries({ queryKey: exchangeKeys.count(userId) })
    },
  })
}
