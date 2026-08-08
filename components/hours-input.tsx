"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAX_HOURS_PER_TYPE } from "@/lib/types"

interface HoursInputProps {
  id: string
  label: string
  value: number
  accentVar: string
  onChange: (value: number) => void
}

export function HoursInput({ id, label, value, accentVar, onChange }: HoursInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (raw === "") {
      onChange(0)
      return
    }
    const n = Number.parseFloat(raw)
    if (!Number.isFinite(n)) return
    const clamped = Math.min(Math.max(n, 0), MAX_HOURS_PER_TYPE)
    onChange(Math.round(clamped * 100) / 100)
  }

  function blockInvalidKeys(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
      e.preventDefault()
    }
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-muted/25 p-2.5 transition-colors focus-within:border-ring/50 focus-within:bg-background/80">
      <Label htmlFor={id} className="flex items-center gap-2 text-xs font-medium">
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full shadow-sm"
          style={{ backgroundColor: `var(${accentVar})` }}
        />
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={MAX_HOURS_PER_TYPE}
        step={0.5}
        value={value === 0 ? "" : value}
        placeholder="0"
        onKeyDown={blockInvalidKeys}
        onChange={handleChange}
        className="h-9 border-0 bg-transparent px-1 text-right font-heading text-base font-semibold tabular-nums shadow-none focus-visible:ring-0"
      />
    </div>
  )
}
