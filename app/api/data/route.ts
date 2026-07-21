import { NextResponse } from "next/server"

import { getAppData, replaceAll } from "@/lib/repo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/data -> estado completo (entradas + ajustes)
export async function GET() {
  try {
    return NextResponse.json(getAppData())
  } catch (err) {
    console.log("[v0] GET /api/data error:", (err as Error).message)
    return NextResponse.json({ error: "No se pudo leer la base de datos" }, { status: 500 })
  }
}

// PUT /api/data -> reemplaza todo el estado (usado por importaciones)
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const data = replaceAll(body)
    return NextResponse.json(data)
  } catch (err) {
    console.log("[v0] PUT /api/data error:", (err as Error).message)
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }
}
