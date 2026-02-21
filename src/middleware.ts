import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_NAME, sign, verify } from '@/lib/session'

export async function middleware(request: NextRequest) {
  // API routes: require valid session token
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token || !(await verify(token))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }
  }

  // All requests: ensure session cookie exists
  const response = NextResponse.next()
  const existing = request.cookies.get(COOKIE_NAME)?.value
  if (!existing || !(await verify(existing))) {
    const timestamp = Date.now().toString(36)
    const token = await sign(timestamp)
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
  }

  return response
}

export const config = {
  matcher: ['/api/:path*', '/'],
}
