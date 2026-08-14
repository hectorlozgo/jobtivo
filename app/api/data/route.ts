import { NextResponse } from 'next/server'

import { handleRouteError, requireUserId } from '@/lib/auth-helpers'
import { getAppData } from '@/lib/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()
    return NextResponse.json(await getAppData(userId))
  } catch (err) {
    return handleRouteError(err, 'No se pudo leer la base de datos')
  }
}
