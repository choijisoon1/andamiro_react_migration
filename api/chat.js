const ALLOWED_MODELS = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
])
const DEFAULT_MODEL      = 'claude-haiku-4-5-20251001'
const DEFAULT_MAX_TOKENS = 512

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_KEY

const ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
].filter(Boolean)

export default async function handler(req, res) {
  const origin        = req.headers.origin ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] ?? '')
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method Not Allowed' }); return }

  // Supabase로 토큰 검증
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
  })
  if (!authRes.ok) { res.status(401).json({ error: 'Unauthorized' }); return }

  // Anthropic API 키 확인
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(500).json({ error: 'Server API key not configured' }); return }

  // 요청 파싱
  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' }); return
  }

  const { system, messages, model: reqModel, max_tokens: reqMaxTokens } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Invalid messages' }); return
  }

  const model     = ALLOWED_MODELS.has(reqModel) ? reqModel : DEFAULT_MODEL
  const maxTokens = (Number.isInteger(reqMaxTokens) && reqMaxTokens > 0 && reqMaxTokens <= 4096)
    ? reqMaxTokens : DEFAULT_MAX_TOKENS

  // Anthropic 호출
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key':         apiKey,
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', message: err.message })
  }
}
