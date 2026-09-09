import { BUILTIN_CD, type Countdown } from './constants'
import { daysLeft } from './date'

/** Built-ins (minus removed) + custom, sorted: upcoming ascending, passed sink. */
export function sortedCountdowns(custom: Countdown[], removed: string[]): Countdown[] {
  const rm = removed || []
  let list: Countdown[] = BUILTIN_CD.filter((b) => rm.indexOf(b.id) < 0).map((b) => ({
    ...b,
    built: true,
  }))
  list = list.concat(custom)
  list.sort((a, b) => {
    const da = daysLeft(a.date)
    const db = daysLeft(b.date)
    if (da < 0 && db < 0) return db - da
    if (da < 0) return 1
    if (db < 0) return -1
    return da - db
  })
  return list
}
