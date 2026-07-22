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

  const { token, password, code } = await req.json() as { token?: string; password?: string; code?: string }

  // 코드만으로 입장 (다중 입장 가능, RLS 우회)
  if (code && !token) {
    const { data: post } = await admin
      .from('exchange_posts')
      .select('id, user_id, password')
      .eq('password', code.trim().toUpperCase())
      .maybeSingle()
    if (!post) return json({ error: 'invalid_code' }, 404)
    const userId = authData.user.id
    if (post.user_id !== userId) {
      const { error: memberError } = await admin
        .from('exchange_members')
        .upsert({ post_id: post.id, user_id: userId }, { onConflict: 'post_id,user_id' })
      if (memberError) return json({ error: memberError.message }, 500)
    }
    return json({ post_id: post.id })
  }

  // 토큰 방식 (기존 단일 초대)
  if (!token || !password?.trim()) return json({ error: 'Missing fields' }, 400)

  const { data: invitation } = await admin
    .from('exchange_invitations')
    .select('id, status, accepted_by_user_id, post:exchange_posts(id, user_id, password)')
    .eq('token', token)
    .maybeSingle()

  const post = invitation?.post
  if (!invitation || !post || invitation.status !== 'pending') return json({ error: 'Invalid invitation' }, 404)

  const storedPw = (post.password ?? '').trim()
  const inputPw = password.trim()
  if (storedPw !== inputPw) return json({ error: 'invalid_password' }, 403)

  const userId = authData.user.id
  if (post.user_id !== userId) {
    const { error: memberError } = await admin
      .from('exchange_members')
      .upsert({ post_id: post.id, user_id: userId }, { onConflict: 'post_id,user_id' })
    if (memberError) return json({ error: memberError.message }, 500)
  }

  const { error: invitationError } = await admin
    .from('exchange_invitations')
    .update({
      status: 'accepted',
      accepted_by_user_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.id)
    .eq('status', 'pending')

  if (invitationError) return json({ error: invitationError.message }, 500)
  return json({ post_id: post.id })
})
