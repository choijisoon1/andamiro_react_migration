import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ROOM_CREATED_WORKFLOW_URL =
  Deno.env.get('ROOM_CREATED_WORKFLOW_URL') ??
  'https://fidelity-daredevil-factsheet.ngrok-free.dev/workflow/jQ6ExWN9z6zA4esN'

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

function publicRoom(room: Record<string, unknown>) {
  return {
    id: room.id,
    user_id: room.user_id,
    title: room.title,
    content: room.content,
    image_url: room.image_url,
    read_count: room.read_count,
    created_at: room.created_at,
  }
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

  let body: {
    title?: string
    content?: string
    image_url?: string | null
    password?: string | null
    client_request_id?: string
  }

  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const title = body.title?.trim()
  const content = body.content?.trim()
  const clientRequestId = body.client_request_id?.trim()
  if (!title || !content || !clientRequestId)
    return json({ error: 'Missing required fields' }, 400)

  const userId = authData.user.id

  const { data: existing } = await admin
    .from('exchange_posts')
    .select('*')
    .eq('user_id', userId)
    .eq('client_request_id', clientRequestId)
    .maybeSingle()

  let room = existing
  let created = false

  if (!room) {
    const { data, error } = await admin
      .from('exchange_posts')
      .insert({
        user_id: userId,
        title,
        content,
        image_url: body.image_url ?? null,
        password: body.password?.trim() || null,
        client_request_id: clientRequestId,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: racedRoom } = await admin
          .from('exchange_posts')
          .select('*')
          .eq('user_id', userId)
          .eq('client_request_id', clientRequestId)
          .maybeSingle()
        if (!racedRoom) return json({ error: error.message }, 500)
        room = racedRoom
      } else {
        return json({ error: error.message }, 500)
      }
    } else {
      room = data
      created = true
    }
  }

  if (!room) return json({ error: 'Room creation failed' }, 500)

  const { data: invitationInsert, error: invitationError } = await admin
    .from('exchange_invitations')
    .upsert(
      { post_id: room.id, inviter_user_id: userId },
      { onConflict: 'post_id', ignoreDuplicates: true }
    )
    .select('token')
    .maybeSingle()

  if (invitationError) return json({ error: invitationError.message }, 500)

  const invitation = invitationInsert ?? (
    await admin
      .from('exchange_invitations')
      .select('token')
      .eq('post_id', room.id)
      .single()
  ).data

  if (!invitation) return json({ error: 'Invitation creation failed' }, 500)

  const { data: event, error: eventError } = await admin
    .from('exchange_room_events')
    .upsert(
      { room_id: room.id, event_type: 'room_created' },
      { onConflict: 'room_id,event_type', ignoreDuplicates: true }
    )
    .select()
    .maybeSingle()

  if (eventError) return json({ error: eventError.message }, 500)

  if (event) {
    EdgeRuntime.waitUntil((async () => {
      try {
        const workflowRes = await fetch(ROOM_CREATED_WORKFLOW_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'room_created',
            room_id: room.id,
            creator_user_id: room.user_id,
            title: room.title,
            created_at: room.created_at,
          }),
        })

        await admin
          .from('exchange_room_events')
          .update({
            status: workflowRes.ok ? 'processed' : 'failed',
            workflow_status: workflowRes.status,
            workflow_error: workflowRes.ok ? null : `HTTP ${workflowRes.status}`,
            attempts: 1,
            processed_at: new Date().toISOString(),
          })
          .eq('id', event.id)
      } catch (err) {
        await admin
          .from('exchange_room_events')
          .update({
            status: 'failed',
            workflow_error: err instanceof Error ? err.message : 'workflow_failed',
            attempts: 1,
            processed_at: new Date().toISOString(),
          })
          .eq('id', event.id)
      }
    })())
  }

  return json({ room: publicRoom(room), invitation_token: invitation.token, created })
})
