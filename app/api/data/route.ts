import { NextResponse } from 'next/server'

import { UnauthorizedError, requireUserId, unauthorizedResponse } from '@/lib/auth-helpers'
import { getAppData } from '@/lib/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()
    return NextResponse.json(await getAppData(userId))
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse()
    console.error('[data] GET error:', (err as Error).message)
    return NextResponse.json({ error: 'No se pudo leer la base de datos' }, { status: 500 })
  }
}
