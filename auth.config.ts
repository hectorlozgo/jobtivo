import type { NextAuthConfig } from 'next-auth'

/**
 * Config edge-safe (sin Prisma/bcrypt) para middleware.
 * Providers reales viven en auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: '/login'
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const isLoggedIn = !!auth?.user

      if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
        if (!isLoggedIn) {
          return Response.json({ error: 'No autenticado' }, { status: 401 })
        }
        return true
      }

      const isPublic =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/api/auth')

      if (isPublic) {
        if (isLoggedIn && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
          return Response.redirect(new URL('/', request.nextUrl))
        }
        return true
      }

      return isLoggedIn
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    }
  },
  session: {
    strategy: 'jwt'
  },
  trustHost: true
} satisfies NextAuthConfig
