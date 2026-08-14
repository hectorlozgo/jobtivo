'use client'

import useSWR from 'swr'
import { toast } from 'sonner'

import { type AppData, type DayEntry, type Settings, DEFAULT_DATA } from '@/lib/types'
import { sanitizeData } from '@/lib/validation'

const KEY = '/api/data'
const OFFLINE_MESSAGE = 'No hay conexión con el servidor. Inténtalo de nuevo.'

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true
  const message = err instanceof Error ? err.message : String(err)
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(
    message,
  )
}

function userFacingMessage(err: unknown, fallback: string): string {
  if (isNetworkError(err)) return OFFLINE_MESSAGE
  const message = err instanceof Error ? err.message : ''
  if (!message || message === 'No autenticado') return message || fallback
  return message
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  return data.error ?? fallback
}

async function fetcher(url: string): Promise<AppData> {
  let res: Response
  try {
    res = await fetch(url, { credentials: 'include' })
  } catch (err) {
    throw new Error(isNetworkError(err) ? OFFLINE_MESSAGE : 'No se pudieron cargar los datos')
  }
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new Error('No autenticado')
  }
  if (!res.ok) throw new Error(await parseError(res, 'No se pudieron cargar los datos'))
  return sanitizeData(await res.json())
}

async function mutateRequest(input: string, init: RequestInit, fallback: string) {
  let res: Response
  try {
    res = await fetch(input, { ...init, credentials: 'include' })
  } catch (err) {
    throw new Error(isNetworkError(err) ? OFFLINE_MESSAGE : fallback)
  }
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('No autenticado')
  }
  if (!res.ok) throw new Error(await parseError(res, fallback))
}

function toastIfUserFacing(err: unknown, fallback: string) {
  const message = userFacingMessage(err, fallback)
  if (message !== 'No autenticado') toast.error(message)
}

function hasHours(entry: DayEntry): boolean {
  return Object.values(entry.hours).some((h) => h > 0)
}

export function useAppData() {
  const { data, error, isLoading, mutate } = useSWR<AppData>(KEY, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    fallbackData: undefined,
    onError(err) {
      toastIfUserFacing(err, 'No se pudieron cargar los datos')
    },
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

    try {
      await mutate(
        async () => {
          if (hasHours(entry)) {
            await mutateRequest(
              '/api/entries',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
              },
              'No se pudo guardar la entrada',
            )
          } else {
            await mutateRequest(
              `/api/entries?date=${encodeURIComponent(entry.date)}`,
              { method: 'DELETE' },
              'No se pudo eliminar',
            )
          }
          return fetcher(KEY)
        },
        { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
      )
    } catch (err) {
      toastIfUserFacing(err, 'No se pudo guardar la entrada')
    }
  }

  async function removeEntry(iso: string) {
    const optimistic: AppData = { ...appData, entries: { ...appData.entries } }
    delete optimistic.entries[iso]
    try {
      await mutate(
        async () => {
          await mutateRequest(
            `/api/entries?date=${encodeURIComponent(iso)}`,
            { method: 'DELETE' },
            'No se pudo eliminar',
          )
          return fetcher(KEY)
        },
        { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
      )
    } catch (err) {
      toastIfUserFacing(err, 'No se pudo eliminar')
    }
  }

  async function saveMany(entries: DayEntry[]) {
    const optimistic: AppData = { ...appData, entries: { ...appData.entries } }
    for (const e of entries) optimistic.entries[e.date] = e
    try {
      await mutate(
        async () => {
          await mutateRequest(
            '/api/entries',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bulk: entries })
            },
            'No se pudieron guardar las entradas',
          )
          return fetcher(KEY)
        },
        { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
      )
    } catch (err) {
      toastIfUserFacing(err, 'No se pudieron guardar las entradas')
    }
  }

  async function saveSettings(settings: Settings) {
    const optimistic: AppData = { ...appData, settings }
    try {
      await mutate(
        async () => {
          await mutateRequest(
            '/api/settings',
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settings)
            },
            'No se pudieron guardar los ajustes',
          )
          return fetcher(KEY)
        },
        { optimisticData: optimistic, revalidate: false, rollbackOnError: true }
      )
    } catch (err) {
      toastIfUserFacing(err, 'No se pudieron guardar los ajustes')
    }
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
