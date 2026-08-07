import { NextResponse } from 'next/server'

import { auth } from '@/auth'

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
