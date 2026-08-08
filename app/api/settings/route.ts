import { NextResponse } from 'next/server'

import { UnauthorizedError, requireUserId, unauthorizedResponse } from '@/lib/auth-helpers'
import { saveSettings } from '@/lib/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(request: Request) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const settings = await saveSettings(userId, body)
    return NextResponse.json(settings)
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse()
    console.error('[settings] PUT error:', (err as Error).message)
    return NextResponse.json({ error: 'Ajustes inválidos' }, { status: 400 })
  }
}
