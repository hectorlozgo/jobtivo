'use client'

import useSWR from 'swr'

import { type AppData, type DayEntry, type Settings, DEFAULT_DATA } from '@/lib/types'
import { sanitizeData } from '@/lib/validation'

const KEY = '/api/data'

async function fetcher(url: string): Promise<AppData> {
  const res = await fetch(url, { credentials: 'include' })
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new Error('No autenticado')
  }
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
            credentials: 'include',
            body: JSON.stringify(entry)
          })
        } else {
          await fetch(`/api/entries?date=${encodeURIComponent(entry.date)}`, {
            method: 'DELETE',
            credentials: 'include'
          })
        }
        return fetcher(KEY)
      },
      { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
    )
  }

  async function removeEntry(iso: string) {
    const optimistic: AppData = { ...appData, entries: { ...appData.entries } }
    delete optimistic.entries[iso]
    await mutate(
      async () => {
        await fetch(`/api/entries?date=${encodeURIComponent(iso)}`, {
          method: 'DELETE',
          credentials: 'include'
        })
        return fetcher(KEY)
      },
      { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
    )
  }

  async function saveMany(entries: DayEntry[]) {
    const optimistic: AppData = { ...appData, entries: { ...appData.entries } }
    for (const e of entries) optimistic.entries[e.date] = e
    await mutate(
      async () => {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ bulk: entries })
        })
        return fetcher(KEY)
      },
      { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
    )
  }

  async function saveSettings(settings: Settings) {
    const optimistic: AppData = { ...appData, settings }
    await mutate(
      async () => {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(settings)
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
    saveSettings
  }
}
