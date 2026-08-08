import type { HourType } from "./types"

const CHART_VARS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
] as const

/** Variable CSS de color para un tipo de hora según su posición en el catálogo. */
export function hourColorVar(typeId: string, hourTypes: HourType[]): string {
  const index = hourTypes.findIndex((t) => t.id === typeId)
  const i = index >= 0 ? index : 0
  return CHART_VARS[i % CHART_VARS.length]
}
