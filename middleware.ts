import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'

import { authConfig } from '@/auth.config'
import { clientIp, isRateLimited, LOGIN_RATE, REGISTER_RATE } from '@/lib/rate-limit'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  if (req.method !== 'POST') return

  const { pathname } = req.nextUrl
  const ip = clientIp(req)

  if (pathname === '/api/auth/register') {
    if (isRateLimited(`register:${ip}`, REGISTER_RATE.limit, REGISTER_RATE.windowMs)) {
      return NextResponse.json({ error: 'Demasiados intentos. Prueba más tarde.' }, { status: 429 })
    }
    return
  }

  if (pathname === '/api/auth/callback/credentials' || pathname === '/api/auth/signin') {
    if (isRateLimited(`login:${ip}`, LOGIN_RATE.limit, LOGIN_RATE.windowMs)) {
      return NextResponse.json({ error: 'Demasiados intentos. Prueba más tarde.' }, { status: 429 })
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
