import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'

import { authConfig } from '@/auth.config'
import { getDb, getDbOrMemory } from '@/lib/db'
import { ensureUserSettings } from '@/lib/repo'
import { DEFAULT_DATA } from '@/lib/types'
import { sanitizeSettings } from '@/lib/validation'

function getAdapter() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL ?? process.env.POSTGRES_URL
  if (!databaseUrl) return undefined
  try {
    return PrismaAdapter(getDb())
  } catch {
    return undefined
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: getAdapter(),
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' }
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '')
          .trim()
          .toLowerCase()
        const password = String(credentials?.password ?? '')
        if (!email || !password) return null

        const db = getDbOrMemory()
        const user = await db.user.findUnique({ where: { email } })
        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: 'image' in user ? user.image : null
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
    async signIn({ user }) {
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
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  const password = input.password

  if (!email || !name || password.length < 8) {
    throw new Error('Datos de registro inválidos')
  }

  const db = getDbOrMemory()
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error('EMAIL_TAKEN')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const settings = sanitizeSettings(DEFAULT_DATA.settings)

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
}
