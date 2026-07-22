import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY  = Deno.env.get('VITE_VAPID_PUBLIC_KEY')!
const VAPID_SUBJECT     = 'mailto:wnsxkai@gmail.com'

function fromBase64Url(value: string): Uint8Array {
  return Uint8Array.from(
    atob(value.replace(/-/g, '+').replace(/_/g, '/')),
    (char) => char.charCodeAt(0)
  )
}

// VAPID JWT 서명 (ES256)
async function signVapidJwt(audience: string): Promise<string> {
  const header  = { alg: 'ES256', typ: 'JWT' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  }
  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const signingInput = `${encode(header)}.${encode(payload)}`

  const publicKey = fromBase64Url(VAPID_PUBLIC_KEY)
  const privateKey = fromBase64Url(VAPID_PRIVATE_KEY)
  if (publicKey.length !== 65 || publicKey[0] !== 4 || privateKey.length !== 32)
    throw new Error('Invalid VAPID key material')

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: toBase64Url(publicKey.slice(1, 33)),
      y: toBase64Url(publicKey.slice(33, 65)),
      d: toBase64Url(privateKey),
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return `${signingInput}.${sigB64}`
}

// Web Push 암호화 (RFC 8291)
async function encryptPayload(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  plaintext: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const p256dh = fromBase64Url(subscription.keys.p256dh)
  const auth   = fromBase64Url(subscription.keys.auth)

  // 서버 ECDH 키쌍 생성
  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const serverPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey))

  // 클라이언트 공개키 import
  const clientPublicKey = await crypto.subtle.importKey('raw', p256dh, { name: 'ECDH', namedCurve: 'P-256' }, false, [])

  // ECDH shared secret
  const sharedBits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPublicKey }, serverKeyPair.privateKey, 256))

  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF — auth secret → IKM
  const authKey = await crypto.subtle.importKey('raw', auth, { name: 'HKDF' }, false, ['deriveBits'])
  const prk = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: sharedBits, info: new TextEncoder().encode('Content-Encoding: auth\0') },
    authKey, 256
  ))

  // HKDF — content encryption key
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HKDF' }, false, ['deriveBits'])

  const keyInfo = concat([
    new TextEncoder().encode('Content-Encoding: aesgcm\0'),
    new Uint8Array([0, 65]),
    p256dh,
    new Uint8Array([0, 65]),
    serverPublicKeyRaw,
  ])
  const nonceInfo = concat([
    new TextEncoder().encode('Content-Encoding: nonce\0'),
    new Uint8Array([0, 65]),
    p256dh,
    new Uint8Array([0, 65]),
    serverPublicKeyRaw,
  ])

  const contentKey = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo },   prkKey, 128))
  const nonce      = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prkKey, 96))

  const aesKey = await crypto.subtle.importKey('raw', contentKey, { name: 'AES-GCM' }, false, ['encrypt'])
  const encoded = new TextEncoder().encode(plaintext)
  // 2-byte padding prefix
  const padded = concat([new Uint8Array(2), encoded])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded))

  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw }
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}

function toBase64Url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey' } })
  }

  const { subscription, title, body, url } = await req.json() as {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
    title: string
    body: string
    url?: string
  }

  const payload = JSON.stringify({ title, body, url: url ?? '/exchange' })

  const { ciphertext, salt, serverPublicKey } = await encryptPayload(subscription, payload)

  const origin = new URL(subscription.endpoint).origin
  const jwt    = await signVapidJwt(origin)

  const vapidHeader = [
    `vapid t=${jwt}`,
    `k=${toBase64Url(fromBase64Url(VAPID_PUBLIC_KEY))}`,
  ].join(',')

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption':       `salt=${toBase64Url(salt)}`,
      'Crypto-Key':       `dh=${toBase64Url(serverPublicKey)}; ${vapidHeader}`,
      'Authorization':    `vapid t=${jwt}, k=${toBase64Url(fromBase64Url(VAPID_PUBLIC_KEY))}`,
      'TTL':              '86400',
    },
    body: ciphertext,
  })

  return new Response(JSON.stringify({ status: res.status }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})
