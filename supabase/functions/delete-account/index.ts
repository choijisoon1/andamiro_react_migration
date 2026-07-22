import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'missing_env', details: 'Required Supabase environment variables are missing' }, 500)
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return json({ error: 'missing_token', details: 'Authorization token is required' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return json({ error: 'invalid_user', details: userError?.message ?? 'User not found' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const userId = user.id
    const deleteSteps = [
      ['push_subscriptions', () => admin.from('push_subscriptions').delete().eq('user_id', userId)],
      ['exchange_comments', () => admin.from('exchange_comments').delete().eq('user_id', userId)],
      ['exchange_members', () => admin.from('exchange_members').delete().eq('user_id', userId)],
      ['exchange_invitations', () => admin.from('exchange_invitations').delete().or(`inviter_user_id.eq.${userId},accepted_by_user_id.eq.${userId}`)],
      ['exchange_posts', () => admin.from('exchange_posts').delete().eq('user_id', userId)],
      ['emotion_records', () => admin.from('emotion_records').delete().eq('user_id', userId)],
      ['profiles', () => admin.from('profiles').delete().eq('id', userId)],
    ] as const

    for (const [stepName, run] of deleteSteps) {
      const { error } = await run()
      if (error) {
        return json({ error: `${stepName}_delete_failed`, details: error.message }, 500)
      }
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
    if (deleteUserError) {
      return json({ error: 'auth_user_delete_failed', details: deleteUserError.message }, 500)
    }

    return json({ ok: true })
  } catch (error) {
    return json({
      error: 'unexpected_error',
      details: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})
