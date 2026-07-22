import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeNickname(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401)

  const body = await req.json().catch(() => ({})) as { filter?: string }
  const filter = body.filter === 'mine' || body.filter === 'shared' ? body.filter : 'all'
  const userId = authData.user.id
  const postSelect = '*, exchange_comments(content, created_at)'

  const result: Array<Record<string, unknown>> = []

  if (filter === 'all' || filter === 'mine') {
    const { data, error } = await admin
      .from('exchange_posts')
      .select(postSelect)
      .eq('user_id', userId)

    if (error) return json({ error: error.message }, 500)
    result.push(...(data ?? []).map(post => ({ ...post, _role: 'owner' })))
  }

  if (filter === 'all' || filter === 'shared') {
    const { data, error } = await admin
      .from('exchange_members')
      .select(`post:exchange_posts(${postSelect}), joined_at`)
      .eq('user_id', userId)

    if (error) return json({ error: error.message }, 500)
    result.push(
      ...(data ?? [])
        .filter(member => member.post)
        .map(member => ({ ...member.post, _role: 'member', _joined_at: member.joined_at }))
    )
  }

  const ownerIds = [...new Set(result.map(post => post.user_id).filter(Boolean))]
  const { data: profiles, error: profileError } = ownerIds.length
    ? await admin.from('profiles').select('id, nickname').in('id', ownerIds)
    : { data: [], error: null }

  if (profileError) return json({ error: profileError.message }, 500)

  const nicknameByUserId = new Map(
    (profiles ?? []).map(profile => [profile.id, normalizeNickname(profile.nickname)])
  )

  return json({
    posts: result.map(post => ({
      ...post,
      owner_nickname: normalizeNickname(post.owner_nickname) ?? nicknameByUserId.get(post.user_id) ?? null,
    })),
  })
})
