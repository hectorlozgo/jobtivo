import { NextResponse } from 'next/server'

import { getAppData } from '@/lib/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/data -> estado completo (entradas + ajustes)
export async function GET() {
  try {
    return NextResponse.json(await getAppData())
  } catch (err) {
    console.log('[v0] GET /api/data error:', (err as Error).message)
    return NextResponse.json({ error: 'No se pudo leer la base de datos' }, { status: 500 })
  }
}
