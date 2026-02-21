/**
 * Lightweight session token for API route protection.
 *
 * On first page load, middleware sets a signed HttpOnly cookie.
 * API routes verify the cookie exists and has a valid signature.
 * This prevents automated curl-based abuse (no cookie = no access)
 * without requiring user accounts.
 *
 * NOTE: For production, add Upstash Redis rate limiting on top of this.
 * This token alone prevents unauthenticated access but not a
 * determined attacker who extracts the cookie from a browser session.
 */

const COOKIE_NAME = 'station7_session'
const SECRET = process.env.SESSION_SECRET || 'station7-dev-secret-change-in-prod'

async function sign(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  const sigHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${value}.${sigHex}`
}

async function verify(token: string): Promise<boolean> {
  const lastDot = token.lastIndexOf('.')
  if (lastDot === -1) return false
  const value = token.slice(0, lastDot)
  const expected = await sign(value)
  return token === expected
}

export { COOKIE_NAME, sign, verify }
