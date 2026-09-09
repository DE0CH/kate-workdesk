/* Date helpers — mirror the original app's logic exactly so stored
   date keys (YYYY-MM-DD, local time) stay compatible. */

export function fmtDate(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

export function todayStr(): string {
  return fmtDate(new Date())
}

export function parseDate(s: string): Date {
  const a = s.split('-')
  return new Date(+a[0], +a[1] - 1, +a[2])
}

/** Whole days from today (local midnight) until the given date string. */
export function daysLeft(s: string): number {
  const now = new Date()
  return Math.ceil(
    (parseDate(s).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      864e5,
  )
}

export function mmdd(s: string): string {
  const a = s.split('-')
  return a[1] + '/' + a[2]
}

/** ISO-style weekday: Monday = 1 … Sunday = 7. */
export function weekdayOf(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay()
}

export function startOfWeek(d: Date): Date {
  const wd = weekdayOf(d)
  const x = new Date(d)
  x.setDate(d.getDate() - wd + 1)
  return x
}

export function weekKeyOf(d: Date): string {
  return fmtDate(startOfWeek(d))
}
