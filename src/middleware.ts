import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const WINDOW_MS = 60_000 // 60 seconds
const MAX_REQUESTS = 30

const hits = new Map<string, number[]>()

// Periodic cleanup to prevent unbounded memory growth
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < WINDOW_MS) return
  lastCleanup = now
  for (const [key, timestamps] of hits) {
    const valid = timestamps.filter(t => now - t < WINDOW_MS)
    if (valid.length === 0) {
      hits.delete(key)
    } else {
      hits.set(key, valid)
    }
  }
}

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1'

  const now = Date.now()
  cleanup()

  const timestamps = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  if (timestamps.length >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  timestamps.push(now)
  hits.set(ip, timestamps)

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
