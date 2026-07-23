import { supabase } from '@/lib/supabase'

const POST_SELECT = '*, exchange_comments(content, created_at)'
const POST_SELECT_WITH_OWNER =
  '*, profiles(id, nickname), exchange_comments(content, created_at)'

function requireUserId(userId) {
  if (!userId) throw new Error('not_authenticated')
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('로그인이 필요해요.')
  return { Authorization: `Bearer ${session.access_token}` }
}

async function functionErrorMessage(error, fallback) {
  const body = await error?.context?.json?.().catch(() => null)
  return body?.error || fallback
}

function normalizeNickname(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function profileNickname(profile) {
  if (Array.isArray(profile)) {
    return normalizeNickname(
      profile.find((item) => normalizeNickname(item?.nickname))?.nickname,
    )
  }
  return normalizeNickname(profile?.nickname)
}

function ownerNicknameFromPost(post) {
  return (
    normalizeNickname(post.owner_nickname)
    ?? profileNickname(post.profiles)
    ?? profileNickname(post.profile)
    ?? profileNickname(post.owner)
    ?? normalizeNickname(post.author_nickname)
    ?? normalizeNickname(post.nickname)
  )
}

async function fetchWithProfileJoin(queryFactory, fallbackFactory) {
  const joined = await queryFactory(POST_SELECT_WITH_OWNER)
  if (!joined.error) return joined
  return fallbackFactory ? fallbackFactory(POST_SELECT) : queryFactory(POST_SELECT)
}

export async function fetchExchangePosts({ userId, filter = 'all' }) {
  requireUserId(userId)

  let posts = null
  try {
    const { data, error } = await supabase.functions.invoke('list-exchange-posts', {
      body: { filter },
      headers: await getAuthHeaders(),
    })
    if (!error && Array.isArray(data?.posts)) posts = data.posts
  } catch {
    posts = null
  }

  const needsOwnPosts = filter === 'all' || filter === 'mine'
  const needsSharedPosts = filter === 'all' || filter === 'shared'

  // Edge Function을 아직 배포하지 않은 개발 환경에서는 기존 직접 조회 방식으로 대체한다.
  if (!posts) {
    const [ownResult, memberResult] = await Promise.all([
      needsOwnPosts
        ? fetchWithProfileJoin(
          (select) => supabase
            .from('exchange_posts')
            .select(select)
            .eq('user_id', userId),
        )
        : Promise.resolve({ data: null }),
      needsSharedPosts
        ? fetchWithProfileJoin(
          (select) => supabase
            .from('exchange_members')
            .select(`post:exchange_posts(${select}), joined_at`)
            .eq('user_id', userId),
        )
        : Promise.resolve({ data: null }),
    ])

    posts = []
    if (ownResult.data) {
      posts.push(...ownResult.data.map((post) => ({ ...post, _role: 'owner' })))
    }
    if (memberResult.data) {
      posts.push(
        ...memberResult.data
          .filter((member) => member.post)
          .map((member) => ({
            ...member.post,
            _role: 'member',
            _joined_at: member.joined_at,
          })),
      )
    }
  }

  const ownerIds = [...new Set(posts.map((post) => post.user_id).filter(Boolean))]
  const { data: profiles } = ownerIds.length
    ? await supabase.from('profiles').select('id, nickname').in('id', ownerIds)
    : { data: [] }
  const nicknameByUserId = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.nickname]),
  )

  const uniquePosts = new Map()
  posts.forEach((post) => {
    const existing = uniquePosts.get(post.id)
    if (!existing || post._role === 'owner') uniquePosts.set(post.id, post)
  })

  return [...uniquePosts.values()]
    .map((post) => {
      const comments = post.exchange_comments ?? []
      const sortedComments = [...comments].sort(
        (left, right) => new Date(right.created_at) - new Date(left.created_at),
      )

      return {
        ...post,
        owner_nickname:
          ownerNicknameFromPost(post)
          ?? normalizeNickname(nicknameByUserId.get(post.user_id))
          ?? null,
        comment_count: comments.length,
        latest_comment: sortedComments[0]?.content ?? null,
        last_activity: sortedComments[0]?.created_at ?? post.created_at,
      }
    })
    .sort(
      (left, right) => new Date(right.last_activity) - new Date(left.last_activity),
    )
}

export async function fetchMyExchangeCount({ userId }) {
  requireUserId(userId)
  const [ownResult, memberResult] = await Promise.all([
    supabase
      .from('exchange_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('exchange_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  if (ownResult.error) throw ownResult.error
  if (memberResult.error) throw memberResult.error
  return (ownResult.count ?? 0) + (memberResult.count ?? 0)
}

export async function fetchExchangePost({ id }) {
  const { data, error } = await supabase
    .from('exchange_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data ?? null
}

export async function createExchangePost({ userId, payload }) {
  requireUserId(userId)
  const { title, content, imageFile, password, clientRequestId } = payload
  let imageUrl = null

  if (imageFile) {
    const extension = imageFile.name.split('.').pop().toLowerCase()
    const path = `${userId}/${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('exchange-images')
      .upload(path, imageFile)

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('exchange-images')
        .getPublicUrl(path)
      imageUrl = publicUrl
    }
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 20_000)
  let data
  let error

  try {
    ({ data, error } = await supabase.functions.invoke('create-exchange-room', {
      body: {
        title,
        content,
        image_url: imageUrl,
        password: password || null,
        client_request_id: clientRequestId,
      },
      headers: await getAuthHeaders(),
      signal: controller.signal,
    }))
  } finally {
    window.clearTimeout(timer)
  }

  if (error) {
    throw new Error(await functionErrorMessage(error, '방 생성에 실패했어요.'))
  }

  return { ...data.room, invitation_token: data.invitation_token }
}

export async function fetchExchangeInvitation({ postId }) {
  const { data, error } = await supabase.functions.invoke(
    'get-exchange-invitation',
    {
      body: { post_id: postId },
      headers: await getAuthHeaders(),
    },
  )

  if (error) {
    throw new Error(
      await functionErrorMessage(error, '초대 정보를 불러오지 못했어요.'),
    )
  }
  return data.invitation
}

export async function regenerateExchangeInvitation({ postId }) {
  const { data, error } = await supabase.functions.invoke(
    'regenerate-exchange-invite-code',
    {
      body: { post_id: postId },
      headers: await getAuthHeaders(),
    },
  )

  if (error) {
    throw new Error(
      await functionErrorMessage(error, '초대코드를 바꾸지 못했어요.'),
    )
  }
  return data.code
}

export async function fetchExchangeInvitationPreview({ token }) {
  const { data, error } = await supabase.functions.invoke(
    'get-exchange-invitation-preview',
    {
      body: { token },
      headers: await getAuthHeaders(),
    },
  )

  if (error) return null
  return data?.invitation ?? null
}

export async function joinExchangeByCode({ code }) {
  const { data, error } = await supabase.functions.invoke(
    'accept-exchange-invitation',
    {
      body: { code: code.trim().toUpperCase() },
      headers: await getAuthHeaders(),
    },
  )

  if (error) {
    const message = await functionErrorMessage(error, '입장 중 오류가 발생했어요.')
    if (message === 'invalid_code') return null
    throw new Error(message)
  }
  return data.post_id
}

export async function joinExchangeRoom({ userId, postId, password }) {
  requireUserId(userId)
  const { data: post, error: fetchError } = await supabase
    .from('exchange_posts')
    .select('id, password, user_id')
    .eq('id', postId)
    .single()

  if (fetchError || !post) throw new Error('방을 찾을 수 없어요.')
  if ((post.password ?? '').trim() !== (password ?? '').trim()) return false
  if (post.user_id === userId) return true

  const { error } = await supabase
    .from('exchange_members')
    .upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id' })

  if (error) throw error
  return true
}

export async function acceptExchangeInvitation({ token, password }) {
  const { data, error } = await supabase.functions.invoke(
    'accept-exchange-invitation',
    {
      body: { token, password },
      headers: await getAuthHeaders(),
    },
  )

  if (error) {
    const message = await functionErrorMessage(error, '입장 중 오류가 발생했어요.')
    if (error.context?.status === 403 && message === 'invalid_password') return false
    throw new Error(message)
  }
  return data.post_id
}

export async function fetchExchangeComments({ postId }) {
  const { data, error } = await supabase
    .from('exchange_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createExchangeComment({ userId, postId, content }) {
  requireUserId(userId)
  const { data, error } = await supabase
    .from('exchange_comments')
    .insert({ post_id: postId, user_id: userId, content })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteExchangeComment({ userId, commentId }) {
  requireUserId(userId)
  const { error } = await supabase
    .from('exchange_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)

  if (error) throw error
  return true
}

export async function sendExchangeCommentPush({ postId }) {
  const { data, error } = await supabase.functions.invoke(
    'send-comment-notification',
    {
      body: { post_id: postId },
      headers: await getAuthHeaders(),
    },
  )

  if (error) {
    throw new Error(
      await functionErrorMessage(error, '댓글 알림 발송에 실패했어요.'),
    )
  }
  return data
}

export async function deleteExchangePost({ userId, id }) {
  requireUserId(userId)
  const { error } = await supabase
    .from('exchange_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
  return true
}
