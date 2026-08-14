import { NextResponse } from 'next/server'

import { handleRouteError, requireUserId } from '@/lib/auth-helpers'
import { deleteEntry, upsertEntry, upsertMany } from '@/lib/repo'
import { MAX_BULK_ENTRIES } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    if (Array.isArray(body?.bulk)) {
      if (body.bulk.length > MAX_BULK_ENTRIES) {
        return NextResponse.json(
          { error: `Máximo ${MAX_BULK_ENTRIES} entradas por lote` },
          { status: 400 },
        )
      }
      const saved = await upsertMany(userId, body.bulk)
      return NextResponse.json({ saved })
    }
    const entry = await upsertEntry(userId, body)
    if (!entry) {
      return NextResponse.json({ error: 'Entrada inválida' }, { status: 400 })
    }
    return NextResponse.json(entry)
  } catch (err) {
    return handleRouteError(err, 'No se pudo guardar la entrada')
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId()
    const date = new URL(request.url).searchParams.get('date')
    const ok = await deleteEntry(userId, date)
    if (!ok) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err, 'No se pudo eliminar')
  }
}
