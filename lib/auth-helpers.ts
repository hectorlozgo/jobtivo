import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { DatabaseUnavailableError } from '@/lib/db'

export class UnauthorizedError extends Error {
  constructor() {
    super('No autenticado')
    this.name = 'UnauthorizedError'
  }
}

export async function requireUserId(): Promise<string> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new UnauthorizedError()
  return userId
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
}

export function serviceUnavailableResponse() {
  return NextResponse.json(
    { error: 'Servicio no disponible. Inténtalo más tarde.' },
    { status: 503 },
  )
}

export function handleRouteError(
  err: unknown,
  fallbackMessage: string,
  fallbackStatus = 500,
) {
  if (err instanceof UnauthorizedError) return unauthorizedResponse()
  if (err instanceof DatabaseUnavailableError) return serviceUnavailableResponse()
  console.error('[api]', fallbackMessage, err instanceof Error ? err.message : err)
  return NextResponse.json({ error: fallbackMessage }, { status: fallbackStatus })
}

