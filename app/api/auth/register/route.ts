import { NextResponse } from 'next/server'

import { createUserWithPassword } from '@/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string
      email?: string
      password?: string
      confirmPassword?: string
    }

    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim()
    const password = String(body.password ?? '')
    const confirmPassword = String(body.confirmPassword ?? '')

    if (!name || !email || password.length < 8) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña (mín. 8 caracteres) son obligatorios' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
    }

    const user = await createUserWithPassword({ name, email, password })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 })
  } catch (err) {
    const message = (err as Error).message
    if (message === 'EMAIL_TAKEN') {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 })
    }
    console.log('[auth] register error:', message)
    return NextResponse.json({ error: 'No se pudo completar el registro' }, { status: 500 })
  }
}
