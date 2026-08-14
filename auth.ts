import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'

import { authConfig } from '@/auth.config'
import { DatabaseUnavailableError, getDb, getDbOrMemory, isDatabaseUnavailable, isUniqueConstraintError } from '@/lib/db'
import { isRateLimited, LOGIN_RATE } from '@/lib/rate-limit'
import { ensureUserSettings } from '@/lib/repo'
import { DEFAULT_DATA } from '@/lib/types'
import { isValidPassword, normalizeEmail, normalizeName, sanitizeSettings } from '@/lib/validation'

let dummyPasswordHash: string | undefined
function getDummyPasswordHash() {
  dummyPasswordHash ??= bcrypt.hashSync('jobtime-timing-dummy', 12)
  return dummyPasswordHash
}

function getAdapter() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL ?? process.env.POSTGRES_URL
  if (!databaseUrl) return undefined
  try {
    return PrismaAdapter(getDb())
  } catch {
    return undefined
  }
}

function googleEmailVerified(profile: unknown): boolean {
  if (!profile || typeof profile !== 'object') return true
  const verified = (profile as { email_verified?: boolean | string }).email_verified
  if (verified === false || verified === 'false') return false
  return true
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: getAdapter(),
  providers: [
    Google({}),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' }
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email)
        const password = String(credentials?.password ?? '')
        if (!email || !isValidPassword(password)) {
          return null
        }

        if (isRateLimited(`login-email:${email}`, LOGIN_RATE.limit, LOGIN_RATE.windowMs)) {
          return null
        }

        try {
          const db = getDbOrMemory()
          const user = await db.user.findUnique({ where: { email } })
          const hash = user?.passwordHash ?? getDummyPasswordHash()
          const valid = await bcrypt.compare(password, hash)
          if (!user?.passwordHash || !valid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: 'image' in user ? user.image : null
          }
        } catch (err) {
          if (isDatabaseUnavailable(err)) {
            return null
          }
          throw err
        }
      }
    })
  ],
  events: {
    async createUser({ user }) {
      if (!user.id) return
      await ensureUserSettings(user.id)
    }
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && !googleEmailVerified(profile)) {
        return false
      }
      if (user.id) {
        await ensureUserSettings(user.id)
      }
      return true
    }
  }
})

export async function createUserWithPassword(input: {
  name: string
  email: string
  password: string
}) {
  const email = normalizeEmail(input.email)
  const name = normalizeName(input.name)
  const password = input.password

  if (!email || !name || !isValidPassword(password)) {
    throw new Error('Datos de registro inválidos')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const settings = sanitizeSettings(DEFAULT_DATA.settings)
  const db = getDbOrMemory()

  try {
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        settings: {
          create: { json: settings as object }
        }
      }
    })
    return { id: user.id, email: user.email, name: user.name }
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new Error('REGISTER_REJECTED')
    }
    if (isDatabaseUnavailable(err)) {
      throw err instanceof DatabaseUnavailableError ? err : new DatabaseUnavailableError(err)
    }
    throw err
  }
}
