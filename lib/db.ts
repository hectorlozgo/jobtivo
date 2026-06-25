// Conexión a SQLite (solo servidor) con esquema y datos por defecto.
// Se usa un singleton para reutilizar la conexión entre peticiones en dev.
import "server-only"

import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"

import { DEFAULT_DATA } from "./types"

const DB_PATH =
  process.env.SQLITE_PATH || path.join(process.cwd(), "data", "horas.sqlite")

declare global {
  // eslint-disable-next-line no-var
  var __horasDb: Database.Database | undefined
}

function init(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const db = new Database(DB_PATH)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")

  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      date     TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      normal   REAL NOT NULL DEFAULT 0,
      extra    REAL NOT NULL DEFAULT 0,
      festiva  REAL NOT NULL DEFAULT 0,
      nocturna REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      id   INTEGER PRIMARY KEY CHECK (id = 1),
      json TEXT NOT NULL
    );
  `)

  // Inserta la fila de ajustes por defecto si aún no existe.
  const row = db.prepare("SELECT id FROM settings WHERE id = 1").get()
  if (!row) {
    db.prepare("INSERT INTO settings (id, json) VALUES (1, ?)").run(
      JSON.stringify(DEFAULT_DATA.settings),
    )
  }

  return db
}

export function getDb(): Database.Database {
  if (!globalThis.__horasDb) {
    globalThis.__horasDb = init()
  }
  return globalThis.__horasDb
}
