import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_NAME, sign, verify } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- API routes: require valid session token ---
  if (pathname.startsWith('/api/')) {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token || !(await verify(token))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }
    return NextResponse.next()
  }

  // --- Page requests: issue session token if missing ---
  const existing = request.cookies.get(COOKIE_NAME)?.value
  if (existing && (await verify(existing))) {
    return NextResponse.next()
  }

  // Issue a new signed session token
  const timestamp = Date.now().toString(36)
  const token = await sign(timestamp)
  const response = NextResponse.next()
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })
  return response
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
}
