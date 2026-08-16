# JOBTIVO

App de control de horas: actividades, tipos de hora y tarifas configurables, retención, cotización SS estimada, descanso diario y exportación CSV/PDF. Multi-usuario: cada cuenta tiene su propio dataset. Las cuentas nuevas arrancan con un catálogo genérico (Actividad 1/2, Normal/Extra) que el usuario cambia en Tarifas. En la UI, `categories` se llama «actividades».

Responde en español. UI, toasts y errores de API también en español.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 + PostgreSQL · Auth.js v5 (JWT) · SWR · Tailwind 4 · shadcn (`base-nova`) · pnpm 11

## Comandos

```bash
pnpm install
cp .env.example .env.local   # DATABASE_URL local, nunca la de producción
docker compose up -d
pnpm prisma migrate deploy && pnpm prisma generate
pnpm dev                     # http://localhost:3000 → /login si no hay sesión
```

- Gestor: **pnpm** (no npm/yarn).
- Prisma 7 lee la URL desde `prisma.config.ts`, no desde `schema.prisma`.
- `pnpm build` ejecuta `prisma migrate deploy` antes de `next build`.
- No commitear `.env.local` ni secretos.

## Mapa del repo

| Ruta | Rol |
|------|-----|
| `app/` | Rutas: `/`, `/login`, `/register`; APIs en `app/api/` |
| `components/` | UI de producto; primitivos shadcn en `components/ui/` |
| `lib/types.ts` | Modelo de dominio, límites y `DEFAULT_SETTINGS` |
| `lib/calc.ts` | Horas cobrables, bruto/neto, formato dinero |
| `lib/validation.ts` | Saneado de **toda** entrada (cliente, API y filas de DB) |
| `lib/repo.ts` | Persistencia por `userId` |
| `lib/db.ts` | Prisma (`server-only`); memoria **solo en desarrollo** |
| `lib/use-app-data.ts` | Cliente SWR + mutaciones optimistas |
| `lib/export.ts` | CSV/PDF en el cliente |
| `lib/dates.ts` | Fechas **locales**; semana empieza en lunes |
| `auth.ts` / `auth.config.ts` | Auth.js: Prisma/bcrypt vs config edge-safe |
| `prisma/schema.prisma` | `User`, Auth.js, `Entry` (`@@id([userId, date])`), `Settings` (JSON) |

## Flujo de datos

```
UI → useAppData (SWR /api/data)
  POST /api/entries | PUT /api/settings
    requireUserId() → repo → sanitize* → Prisma
```

- APIs de negocio: `runtime = 'nodejs'` y `dynamic = 'force-dynamic'`.
- Sesión JWT; `session.user.id` es el `userId`. Filtrar **siempre** por usuario.
- Entrada sin horas → DELETE de ese día (no guardar ceros).
- 401 → redirigir a `/login`. En producción, Postgres caído → **503** (sin fallback a memoria).

## Invariantes (no romper)

1. **Aislamiento:** ninguna query de entries/settings sin `userId`.
2. **Saneado:** usar `lib/validation.ts` (límites en `lib/types.ts`). No confiar en JSON de cliente ni de DB.
3. **Cálculos:** solo en `lib/calc.ts`. Descanso se resta de las horas brutas en orden del catálogo `hourTypes`. Bruto = horas cobrables × tarifa de la actividad. Neto = bruto − retención − SS (si está activada). Orientativo, no es nómina.
4. **Auth:** `auth.config.ts` sin Prisma/bcrypt (middleware). Google rechaza email no verificado. Credentials usa hash dummy para timing. Rate limit en login/registro.
5. **Fechas:** `yyyy-mm-dd` en hora local (`lib/dates.ts`), no UTC de `toISOString()`.
6. **Catálogos:** ids estables (`makeCatalogId`). Al añadir tipo de hora o actividad, actualizar `rates` y horas de entradas existentes.
7. **UI:** componentes funcionales; toasts con `sonner`; no añadir librerías si basta con lo que hay.

## Qué no hacer

- No mezclar lógica de cobro en componentes: va a `lib/calc.ts`.
- No leer/escribir la DB desde el cliente.
- No usar la `DATABASE_URL` de producción en local.
- No asumir un único inquilino ni el schema antiguo sin `userId`.
