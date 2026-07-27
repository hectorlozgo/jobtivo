import { NextResponse } from 'next/server'

import { deleteEntry, getEntries, upsertEntry, upsertMany } from '@/lib/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/entries -> mapa iso -> entrada
export async function GET() {
  try {
    return NextResponse.json(await getEntries())
  } catch (err) {
    console.log('[v0] GET /api/entries error:', (err as Error).message)
    return NextResponse.json({ error: 'No se pudieron leer las entradas' }, { status: 500 })
  }
}

// POST /api/entries -> crea/actualiza una entrada o varias (campo "bulk")
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (Array.isArray(body?.bulk)) {
      const saved = await upsertMany(body.bulk)
      return NextResponse.json({ saved })
    }
    const entry = await upsertEntry(body)
    if (!entry) { 
      return NextResponse.json({ error: 'Entrada inválida' }, { status: 400 })
    }
    return NextResponse.json(entry)
  } catch (err) {
    console.log('[v0] POST /api/entries error:', (err as Error).message)
    return NextResponse.json({ error: 'No se pudo guardar la entrada' }, { status: 500 })
  }
}

// DELETE /api/entries?date=YYYY-MM-DD -> elimina una entrada
export async function DELETE(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get('date')
    const ok = await deleteEntry(date)
    if (!ok) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.log('[v0] DELETE /api/entries error:', (err as Error).message)
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 })
  }
}
