import { NextResponse } from 'next/server'

import { UnauthorizedError, requireUserId, unauthorizedResponse } from '@/lib/auth-helpers'
import { deleteEntry, getEntries, upsertEntry, upsertMany } from '@/lib/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userId = await requireUserId()
    return NextResponse.json(await getEntries(userId))
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse()
    console.log('[v0] GET /api/entries error:', (err as Error).message)
    return NextResponse.json({ error: 'No se pudieron leer las entradas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    if (Array.isArray(body?.bulk)) {
      const saved = await upsertMany(userId, body.bulk)
      return NextResponse.json({ saved })
    }
    const entry = await upsertEntry(userId, body)
    if (!entry) {
      return NextResponse.json({ error: 'Entrada inválida' }, { status: 400 })
    }
    return NextResponse.json(entry)
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse()
    console.log('[v0] POST /api/entries error:', (err as Error).message)
    return NextResponse.json({ error: 'No se pudo guardar la entrada' }, { status: 500 })
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
    if (err instanceof UnauthorizedError) return unauthorizedResponse()
    console.log('[v0] DELETE /api/entries error:', (err as Error).message)
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 })
  }
}
