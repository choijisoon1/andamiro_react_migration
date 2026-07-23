import { QueryClient } from '@tanstack/react-query'

// Vue/Pinia에서 직접 보관하던 Supabase 서버 데이터를 React Query 캐시로 관리한다.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})
