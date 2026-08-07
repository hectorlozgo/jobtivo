import { NextResponse } from 'next/server'

import { UnauthorizedError, requireUserId, unauthorizedResponse } from '@/lib/auth-helpers'
import { getSettings, saveSettings } from '@/lib/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()
    return NextResponse.json(await getSettings(userId))
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse()
    console.log('[v0] GET /api/settings error:', (err as Error).message)
    return NextResponse.json({ error: 'No se pudieron leer los ajustes' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const settings = await saveSettings(userId, body)
    return NextResponse.json(settings)
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse()
    console.log('[v0] PUT /api/settings error:', (err as Error).message)
    return NextResponse.json({ error: 'Ajustes inválidos' }, { status: 400 })
  }
}
