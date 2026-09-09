import { HOL_RANGES } from './constants'
import { fmtDate } from './date'

/** date string -> holiday label, expanded from the ranges. */
export const holMap: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  HOL_RANGES.forEach((r) => {
    const d = new Date(r.s)
    const e = new Date(r.e)
    while (d <= e) {
      map[fmtDate(d)] = r.n
      d.setDate(d.getDate() + 1)
    }
  })
  return map
})()
