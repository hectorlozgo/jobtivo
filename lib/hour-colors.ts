import type { HourType } from "./types"

// Variable CSS de color asociada a cada tipo de hora.
export const HOUR_COLOR_VAR: Record<HourType, string> = {
  normal: "--chart-1",
  extra: "--chart-2",
  festiva: "--chart-3",
  nocturna: "--chart-4",
}
