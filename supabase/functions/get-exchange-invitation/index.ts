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

  const { post_id } = await req.json() as { post_id?: string }
  if (!post_id) return json({ error: 'Missing post_id' }, 400)

  const { data: room } = await admin
    .from('exchange_posts')
    .select('id, user_id')
    .eq('id', post_id)
    .maybeSingle()

  if (!room || room.user_id !== authData.user.id) return json({ error: 'Not found' }, 404)

  const { data: invitation, error } = await admin
    .from('exchange_invitations')
    .select('token, status, post:exchange_posts(password)')
    .eq('post_id', post_id)
    .maybeSingle()

  if (error) return json({ error: error.message }, 500)
  if (!invitation) return json({ error: 'Invitation not found' }, 404)
  return json({
    invitation: {
      token: invitation.token,
      status: invitation.status,
      code: invitation.post?.password ?? '',
    },
  })
})
