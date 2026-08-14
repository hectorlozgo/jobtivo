const MAX_KEYS = 10_000

type Bucket = { count: number; resetAt: number }

const hits = new Map<string, Bucket>()

function prune(now: number) {
  if (hits.size < MAX_KEYS) return
  for (const [key, bucket] of hits) {
    if (bucket.resetAt <= now) hits.delete(key)
  }
  if (hits.size >= MAX_KEYS) {
    const oldest = hits.keys().next().value
    if (oldest) hits.delete(oldest)
  }
}

/** true si la clave superó el límite y la petición debe rechazarse. */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  prune(now)
  const bucket = hits.get(key)
  if (!bucket || now >= bucket.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (bucket.count >= limit) return true
  bucket.count += 1
  return false
}

export function clientIp(request: { headers: { get(name: string): string | null } }): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export const REGISTER_RATE = { limit: 5, windowMs: 15 * 60 * 1000 } as const
export const LOGIN_RATE = { limit: 10, windowMs: 15 * 60 * 1000 } as const
