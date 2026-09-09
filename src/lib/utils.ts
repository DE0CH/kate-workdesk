export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function rand(n: number): number {
  return Math.floor(Math.random() * n)
}

export function pick<T>(arr: T[]): T {
  return arr[rand(arr.length)]
}

/** djb2 string hash — same algorithm as the original door-lock. */
export function hashStr(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  }
  return h.toString(36)
}
