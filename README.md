# jobtime

Control de horas con puestos y tipos de hora configurables, tarifas, retención (p. ej. IRPF) y exportación. Incluye preset ETT por defecto. Cada usuario tiene sus propios datos tras iniciar sesión.

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local
docker compose up -d
pnpm prisma migrate deploy
pnpm prisma generate
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000). Sin sesión irás a `/login`.

Usa Postgres local en `.env.local`. La `DATABASE_URL` de producción solo debe estar en el hosting (Vercel, etc.).

## Deploy a producción (Vercel u otro)

1. Variables de entorno en el hosting:

| Variable | Obligatorio | Notas |
|----------|-------------|--------|
| `DATABASE_URL` | sí | PostgreSQL de producción |
| `AUTH_SECRET` | sí | `openssl rand -base64 32` |
| `AUTH_URL` | sí | URL pública, p. ej. `https://tu-dominio.vercel.app` |
| `AUTH_TRUST_HOST` | recomendado | `true` en Vercel |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | opcional | OAuth Google |

2. Redirect de Google: `{AUTH_URL}/api/auth/callback/google`

3. El script `pnpm build` ejecuta `prisma migrate deploy` antes de `next build`, así el schema se aplica en cada deploy.

4. Tras el primer deploy con auth: entra en `/register`, crea tu cuenta y empieza a registrar horas (dataset vacío por usuario).

**Nota:** el paso a multi-usuario es incompatible con el schema single-tenant antiguo. Los datos previos sin `userId` no se conservan al migrar.

## Auth

- Registro y login con email/contraseña
- Login con Google (si configuraste OAuth)
- Las APIs `/api/data`, `/api/entries` y `/api/settings` exigen sesión y filtran por `userId`

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Auth.js](https://authjs.dev)
