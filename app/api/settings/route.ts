import { NextResponse } from 'next/server'

import { handleRouteError, requireUserId } from '@/lib/auth-helpers'
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
    return handleRouteError(err, 'Ajustes inválidos', 400)
  }
}
