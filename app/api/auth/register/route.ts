import { NextResponse } from 'next/server'

import { createUserWithPassword } from '@/auth'
import { DatabaseUnavailableError } from '@/lib/db'
import { clientIp, isRateLimited, REGISTER_RATE } from '@/lib/rate-limit'
import { isValidPassword, normalizeEmail, normalizeName } from '@/lib/validation'
import { MIN_PASSWORD_LENGTH } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const ip = clientIp(request)
    if (isRateLimited(`register-node:${ip}`, REGISTER_RATE.limit, REGISTER_RATE.windowMs)) {
      return NextResponse.json({ error: 'Demasiados intentos. Prueba más tarde.' }, { status: 429 })
    }

    const body = (await request.json()) as {
      name?: string
      email?: string
      password?: string
      confirmPassword?: string
    }

    const name = normalizeName(body.name)
    const email = normalizeEmail(body.email)
    const password = String(body.password ?? '')
    const confirmPassword = String(body.confirmPassword ?? '')

    if (!name || !email || !isValidPassword(password)) {
      return NextResponse.json(
        { error: `Nombre, email y contraseña (mín. ${MIN_PASSWORD_LENGTH} caracteres) son obligatorios` },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
    }

    const user = await createUserWithPassword({ name, email, password })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 })
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) {
      return NextResponse.json(
        { error: 'Servicio no disponible. Inténtalo más tarde.' },
        { status: 503 },
      )
    }
    const message = (err as Error).message
    if (message === 'REGISTER_REJECTED' || message === 'Datos de registro inválidos') {
      return NextResponse.json({ error: 'No se pudo completar el registro' }, { status: 400 })
    }
    return NextResponse.json({ error: 'No se pudo completar el registro' }, { status: 500 })
  }
}
