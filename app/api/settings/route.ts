import { NextResponse } from 'next/server'

import { getSettings, saveSettings } from '@/lib/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/settings -> ajustes (IRPF, tarifas, categoría predeterminada)
export async function GET() {
  try {
    return NextResponse.json(await getSettings())
  } catch (err) {
    console.log('[v0] GET /api/settings error:', (err as Error).message)
    return NextResponse.json({ error: 'No se pudieron leer los ajustes' }, { status: 500 })
  }
}

// PUT /api/settings -> guarda ajustes saneados
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const settings = await saveSettings(body)
    return NextResponse.json(settings)
  } catch (err) {
    console.log('[v0] PUT /api/settings error:', (err as Error).message)
    return NextResponse.json({ error: 'Ajustes inválidos' }, { status: 400 })
  }
}
