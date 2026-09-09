/** Read the server's remaining wait, never assume a fixed 60-second cooldown. */
export function emailRetrySeconds(headers: Headers, body: unknown, now = Date.now()): number {
  const retryAfter = headers.get('Retry-After')
  if (retryAfter !== null) {
    const seconds = /^\d+(\.\d+)?$/.test(retryAfter.trim())
      ? Number(retryAfter)
      : (Date.parse(retryAfter) - now) / 1000
    if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds))
  }
  if (!body || typeof body !== 'object') return 0
  const data = body as Record<string, unknown>
  // Supabase embeds the remaining seconds in its rate-limit error message.
  const message = [data.msg, data.message, data.error_description]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
  const match = message.match(/after\s+(\d+)\s+seconds?\b/i)
  return match ? Number(match[1]) : 0
}
