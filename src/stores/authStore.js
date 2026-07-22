import { create } from 'zustand'

import { supabase } from '@/lib/supabase'

const INIT_TIMEOUT_MS = 8000
const PROFILE_TIMEOUT_MS = 8000
const OAUTH_TIMEOUT_MS = 10000

let initPromise = null
let authListenerUnsubscribe = null

function withTimeout(promise, ms, label = 'operation') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label}_timeout`)), ms)
  })

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timer)
  })
}

export const useAuthStore = create((set, get) => {
  function shouldFetchProfile(nextUser) {
    const { user, profile, profileLoaded } = get()
    if (!nextUser) return false
    if (!user) return true
    if (user.id !== nextUser.id) return true
    if (!profile) return true
    return !profileLoaded
  }

  async function fetchProfile() {
    const user = get().user
    if (!user?.id) {
      set({ profile: null, profileLoaded: true })
      return null
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        set({ profile: null })
        return null
      }

      set({ profile: data })
      return data
    } finally {
      set({ profileLoaded: true })
    }
  }

  function ensureAuthListener() {
    if (authListenerUnsubscribe) return

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({
          user: null,
          profile: null,
          profileLoaded: true,
          loading: false,
        })
        return
      }

      if (!['TOKEN_REFRESHED', 'SIGNED_IN', 'INITIAL_SESSION'].includes(event)) {
        return
      }

      const nextUser = session?.user ?? null
      const needsProfile = shouldFetchProfile(nextUser)
      set({ user: nextUser })

      if (!nextUser) {
        set({ profile: null, profileLoaded: true, loading: false })
        return
      }

      if (!needsProfile) {
        set({ loading: false })
        return
      }

      try {
        await withTimeout(fetchProfile(), PROFILE_TIMEOUT_MS, 'auth_listener_fetch_profile')
      } catch (error) {
        console.error('[auth:onAuthStateChange:fetchProfile]', error)
        if (!get().profile) set({ profileLoaded: true })
      } finally {
        set({ loading: false })
      }
    })

    authListenerUnsubscribe = () => data?.subscription?.unsubscribe?.()
  }

  async function init() {
    if (!get().loading) return
    if (initPromise) return initPromise

    const hasOAuthCode = new URLSearchParams(window.location.search).has('code')

    initPromise = (async () => {
      try {
        if (hasOAuthCode) {
          await withTimeout(
            new Promise((resolve) => {
              let settled = false
              let unsubscribe = null
              const done = () => {
                if (settled) return
                settled = true
                unsubscribe?.()
                resolve()
              }

              const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
                const user = session?.user ?? null
                set({ user })

                if (user) {
                  await withTimeout(fetchProfile(), PROFILE_TIMEOUT_MS, 'auth_oauth_fetch_profile')
                    .catch((error) => {
                      console.error('[auth:init:oauth:fetchProfile]', error)
                      set({ profileLoaded: false })
                    })
                } else {
                  set({ profile: null, profileLoaded: true })
                }

                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') done()
                else if (event === 'INITIAL_SESSION' && session?.user) done()
              })

              unsubscribe = () => data?.subscription?.unsubscribe?.()
              window.setTimeout(done, OAUTH_TIMEOUT_MS)
            }),
            OAUTH_TIMEOUT_MS + 1000,
            'auth_oauth_session',
          )
        } else {
          const { data } = await withTimeout(
            supabase.auth.getSession(),
            INIT_TIMEOUT_MS,
            'auth_get_session',
          )
          const user = data.session?.user ?? null
          set({ user })

          if (user) {
            await withTimeout(fetchProfile(), PROFILE_TIMEOUT_MS, 'auth_fetch_profile')
              .catch((error) => {
                console.error('[auth:init:fetchProfile]', error)
                set({ profileLoaded: false })
              })
          } else {
            set({ profile: null, profileLoaded: true })
          }
        }
      } catch (error) {
        console.error('[auth:init]', error)
        set({ user: null, profile: null, profileLoaded: true })
      } finally {
        set({ loading: false })
        initPromise = null
        ensureAuthListener()
      }
    })()

    return initPromise
  }

  async function updateProfile(payload) {
    const user = get().user
    if (!user?.id) throw new Error('로그인이 필요해요.')

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select('*')
      .single()

    if (error) throw error
    set({ profile: data, profileLoaded: true })
    return data
  }

  async function exchangeOAuthCode(code) {
    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch {
      // Supabase may already have exchanged the code automatically.
    }

    try {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user ?? null
      set({ user })
      if (user) await fetchProfile()
      else set({ profileLoaded: true })
    } catch {
      set({ user: null, profileLoaded: true })
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    set({ user: null, profile: null, profileLoaded: true })
  }

  async function deleteAccount() {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (sessionError || !accessToken) throw new Error('로그인이 필요해요.')

    const { data, error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (error) {
      let message = error.message
      try {
        const response = await error.context?.json()
        message = response?.details || response?.error || message
      } catch {
        // The response body is not always available.
      }
      throw new Error(message)
    }
    if (data?.error) throw new Error(data.details || data.error)
    if (!data?.ok) throw new Error('회원탈퇴에 실패했어요.')

    await supabase.auth.signOut({ scope: 'local' })
    set({ user: null, profile: null, profileLoaded: true })
  }

  async function signInWithGoogle(joinPostId = null, pendingInvite = null) {
    const params = new URLSearchParams()
    if (joinPostId) params.set('pendingJoin', joinPostId)
    if (pendingInvite) params.set('pendingInvite', pendingInvite)
    const query = params.toString()
    const redirectTo = query
      ? `${window.location.origin}?${query}`
      : window.location.origin

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }

  return {
    user: null,
    profile: null,
    loading: true,
    profileLoaded: false,
    init,
    exchangeOAuthCode,
    fetchProfile,
    updateProfile,
    signOut,
    deleteAccount,
    signInWithGoogle,
    isNewUser: () => {
      const { user, profile, profileLoaded } = get()
      return Boolean(user && profileLoaded && !profile)
    },
  }
})
