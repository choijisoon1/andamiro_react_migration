import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const INIT_TIMEOUT_MS = 8000
const PROFILE_TIMEOUT_MS = 8000
const OAUTH_TIMEOUT_MS = 10000

export const useAuthStore = defineStore('auth', () => {
  const user      = ref(null)
  const profile   = ref(null)
  const loading   = ref(true)
  const profileLoaded = ref(false)

  let _initPromise = null
  let authListenerUnsubscribe = null

  function withTimeout(promise, ms, label = 'operation') {
    let timer

    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`${label}_timeout`))
      }, ms)
    })

    return Promise.race([promise, timeout]).finally(() => {
      clearTimeout(timer)
    })
  }

  function shouldFetchProfile(nextUser) {
    if (!nextUser) return false
    if (!user.value) return true
    if (user.value.id !== nextUser.id) return true
    if (!profile.value) return true
    if (!profileLoaded.value) return true
    return false
  }

  function ensureAuthListener() {
    if (authListenerUnsubscribe) return

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        user.value = null
        profile.value = null
        profileLoaded.value = true
        loading.value = false
        return
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const nextUser = session?.user ?? null
        const needProfile = shouldFetchProfile(nextUser)

        user.value = nextUser

        if (!nextUser) {
          profile.value = null
          profileLoaded.value = true
          loading.value = false
          return
        }

        if (!needProfile) {
          loading.value = false
          return
        }

        try {
          await withTimeout(fetchProfile(), PROFILE_TIMEOUT_MS, 'auth_listener_fetch_profile')
        } catch (error) {
          console.error('[auth:onAuthStateChange:fetchProfile]', error)
          if (!profile.value) {
            profileLoaded.value = true
          }
        } finally {
          loading.value = false
        }
      }
    })

    authListenerUnsubscribe = () => data?.subscription?.unsubscribe?.()
  }

  async function init() {
    if (!loading.value) {
      return
    }
    if (_initPromise) {
      return _initPromise
    }

    const hasOAuthCode = new URLSearchParams(window.location.search).has('code')

    _initPromise = (async () => {
      try {
        if (hasOAuthCode) {
          // OAuth 콜백: Supabase가 코드를 자동 교환 → SIGNED_IN 이벤트를 기다림
          await withTimeout(new Promise((resolve) => {
            let settled = false
            let unsubscribe = null
            const done = () => {
              if (settled) return
              settled = true
              unsubscribe?.()
              resolve()
            }
            const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
              user.value = session?.user ?? null
              if (user.value) {
                await withTimeout(fetchProfile(), PROFILE_TIMEOUT_MS, 'auth_oauth_fetch_profile')
                  .catch((error) => {
                    console.error('[auth:init:oauth:fetchProfile]', error)
                    profileLoaded.value = false
                  })
              }
              else { profile.value = null; profileLoaded.value = true }
              if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') done()
              else if (event === 'INITIAL_SESSION' && session?.user) done()
            })
            unsubscribe = () => data?.subscription?.unsubscribe?.()
            setTimeout(done, OAUTH_TIMEOUT_MS)
          }), OAUTH_TIMEOUT_MS + 1000, 'auth_oauth_session')
        } else {
          // 일반 진입: getSession()으로 직접 세션 복구 (가장 신뢰성 높음)
          const { data } = await withTimeout(
            supabase.auth.getSession(),
            INIT_TIMEOUT_MS,
            'auth_get_session'
          )
          user.value = data.session?.user ?? null
          if (user.value) {
            await withTimeout(fetchProfile(), PROFILE_TIMEOUT_MS, 'auth_fetch_profile')
              .catch((error) => {
                console.error('[auth:init:fetchProfile]', error)
                profileLoaded.value = false
              })
          }
          else { profile.value = null; profileLoaded.value = true }
        }
      } catch (error) {
        console.error('[auth:init]', error)
        user.value = null; profile.value = null; profileLoaded.value = true
      } finally {
        loading.value = false
        _initPromise = null
        ensureAuthListener()
      }
    })()

    return _initPromise
  }

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()
      if (error) {
        profile.value = null
        return
      }
      profile.value = data
    } finally {
      profileLoaded.value = true
    }
  }

  async function updateProfile(payload) {
    if (!user.value?.id) throw new Error('로그인이 필요해요.')

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.value.id)
      .select('*')
      .single()

    if (error) throw error

    profile.value = data
    profileLoaded.value = true
    return data
  }

  async function exchangeOAuthCode(code) {
    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch { /* 자동 교환된 경우 무시 */ }
    try {
      const { data } = await supabase.auth.getSession()
      user.value = data.session?.user ?? null
      if (user.value) await fetchProfile()
      else profileLoaded.value = true
    } catch {
      user.value = null
      profileLoaded.value = true
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value    = null
    profile.value = null
    profileLoaded.value = true
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
      } catch { /* response body is not available */ }
      throw new Error(message)
    }
    if (data?.error) throw new Error(data.details || data.error)
    if (!data?.ok) throw new Error('회원탈퇴에 실패했어요.')

    // The server has removed the auth user, so clear the local session even if
    // the automatic SIGNED_OUT event has not arrived yet.
    await supabase.auth.signOut({ scope: 'local' })
    user.value = null
    profile.value = null
    profileLoaded.value = true
  }

  async function signInWithGoogle(joinPostId = null, pendingInvite = null) {
    const params = new URLSearchParams()
    if (joinPostId)    params.set('pendingJoin',   joinPostId)
    if (pendingInvite) params.set('pendingInvite', pendingInvite)
    const qs = params.toString()
    const redirectTo = qs ? `${window.location.origin}?${qs}` : window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }

  const isNewUser = () => user.value && profileLoaded.value && !profile.value

  return { user, profile, loading, profileLoaded, init, exchangeOAuthCode, fetchProfile, updateProfile, signOut, deleteAccount, signInWithGoogle, isNewUser }
})
