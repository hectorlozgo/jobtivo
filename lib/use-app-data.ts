'use client'

import useSWR from 'swr'

import { type AppData, type DayEntry, type Settings, DEFAULT_DATA } from '@/lib/types'
import { sanitizeData } from '@/lib/validation'

const KEY = '/api/data'

async function fetcher(url: string): Promise<AppData> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudieron cargar los datos')
  return sanitizeData(await res.json())
}

function hasHours(entry: DayEntry): boolean {
  return Object.values(entry.hours).some((h) => h > 0)
}

export function useAppData() {
  const { data, error, isLoading, mutate } = useSWR<AppData>(KEY, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    fallbackData: undefined
  })

  const appData = data ?? DEFAULT_DATA

  // Crea/actualiza una entrada. Si no tiene horas, la elimina.
  async function saveEntry(entry: DayEntry) {
    const optimistic: AppData = {
      ...appData,
      entries: { ...appData.entries }
    }
    if (hasHours(entry)) {
      optimistic.entries[entry.date] = entry
    } else {
      delete optimistic.entries[entry.date]
    }

    await mutate(
      async () => {
        if (hasHours(entry)) {
          await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
          })
        } else {
          await fetch(`/api/entries?date=${encodeURIComponent(entry.date)}`, {
            method: 'DELETE'
          })
        }
        return fetcher(KEY)
      },
      { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
    )
  }

  // Elimina una entrada por fecha.
  async function removeEntry(iso: string) {
    const optimistic: AppData = { ...appData, entries: { ...appData.entries } }
    delete optimistic.entries[iso]
    await mutate(
      async () => {
        await fetch(`/api/entries?date=${encodeURIComponent(iso)}`, { method: 'DELETE' })
        return fetcher(KEY)
      },
      { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
    )
  }

  // Inserta/actualiza varias entradas de una vez (aplicar a la semana).
  async function saveMany(entries: DayEntry[]) {
    const optimistic: AppData = { ...appData, entries: { ...appData.entries } }
    for (const e of entries) optimistic.entries[e.date] = e
    await mutate(
      async () => {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bulk: entries })
        })
        return fetcher(KEY)
      },
      { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
    )
  }

  // Guarda ajustes (IRPF, tarifas, categoría predeterminada).
  async function saveSettings(settings: Settings) {
    const optimistic: AppData = { ...appData, settings }
    await mutate(
      async () => {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        })
        return fetcher(KEY)
      },
      { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
    )
  }

  // Reemplaza todo el estado (importación).
  async function replaceAll(next: AppData) {
    const optimistic = sanitizeData(next)
    await mutate(
      async () => {
        await fetch('/api/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next)
        })
        return fetcher(KEY)
      },
      { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
    )
  }

  return {
    data: appData,
    isLoading: isLoading && !data,
    error,
    saveEntry,
    removeEntry,
    saveMany,
    saveSettings,
    replaceAll
  }
}
