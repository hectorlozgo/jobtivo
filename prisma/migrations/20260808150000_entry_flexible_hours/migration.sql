-- Sustituye columnas fijas de horas por un mapa flexible (JSON) para catálogos configurables.
ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "hours" JSONB;

UPDATE "Entry"
SET "hours" = jsonb_build_object(
  'normal', COALESCE("normal", 0),
  'extra', COALESCE("extra", 0),
  'festiva', COALESCE("festiva", 0),
  'nocturna', COALESCE("nocturna", 0)
)
WHERE "hours" IS NULL
   OR "hours" = 'null'::jsonb
   OR "hours" = '{}'::jsonb;

ALTER TABLE "Entry" ALTER COLUMN "hours" SET NOT NULL;
ALTER TABLE "Entry" ALTER COLUMN "hours" SET DEFAULT '{}'::jsonb;

ALTER TABLE "Entry" DROP COLUMN IF EXISTS "normal";
ALTER TABLE "Entry" DROP COLUMN IF EXISTS "extra";
ALTER TABLE "Entry" DROP COLUMN IF EXISTS "festiva";
ALTER TABLE "Entry" DROP COLUMN IF EXISTS "nocturna";
