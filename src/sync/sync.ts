/* ============================================================
   Optional cloud sync — Supabase email magic-link + PostgREST.

   Enabled only when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are
   set at build time; otherwise the whole module is inert and the app
   runs local-only. The anon key is safe in the browser: row-level
   security scopes every request to auth.uid() = user_id, so an
   unauthenticated client sees nothing.

   Ported from the original single-file app's sync layer, adapted to
   the Zustand store. One row per user in table `workbench`
   (user_id uuid PK / data jsonb / updated_at bigint), last-write-wins.
   ============================================================ */
import { useStore } from '../store/store'
import type { WorkbenchData } from '../store/types'

const SYNC_URL = ((import.meta.env.VITE_SUPABASE_URL as string) || '').replace(/\/$/, '')
const SYNC_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''

const DOMAINS: (keyof WorkbenchData)[] = [
  'todos',
  'courses',
  'groups',
  'countdowns',
  'settings',
  'sound',
  'draw',
  'lessonPrep',
]

export function syncReady(): boolean {
  return !!SYNC_URL && !!SYNC_ANON
}

/* ---------------- tiny local-storage helpers ---------------- */
function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}

/* ---------------- session ---------------- */
export interface SbSession {
  access_token: string
  refresh_token: string
  expires_at: number
  uid: string
  email: string
}
export function sbSession(): SbSession | null {
  try {
    return JSON.parse(lsGet('wbSyncSession') || 'null')
  } catch {
    return null
  }
}
function sbSaveSession(s: SbSession) {
  lsSet('wbSyncSession', JSON.stringify(s))
}

/* ---------------- observable status (for the badge) ---------------- */
export interface SyncStatus {
  text: string
  on: boolean
}
let status: SyncStatus = { text: '本地模式', on: false }
const statusListeners = new Set<() => void>()
export function subscribeStatus(cb: () => void): () => void {
  statusListeners.add(cb)
  return () => statusListeners.delete(cb)
}
export function getStatus(): SyncStatus {
  return status
}
function setStatus(text: string, on: boolean) {
  status = { text, on }
  statusListeners.forEach((l) => l())
}

/* first-sync conflict prompt (observable) */
export interface RemoteRec {
  data?: Partial<WorkbenchData>
  updated_at?: number
}
let firstSyncRec: RemoteRec | null = null
const fsListeners = new Set<() => void>()
export function subscribeFirstSync(cb: () => void): () => void {
  fsListeners.add(cb)
  return () => fsListeners.delete(cb)
}
export function getFirstSyncRec(): RemoteRec | null {
  return firstSyncRec
}
function setFirstSync(rec: RemoteRec | null) {
  firstSyncRec = rec
  fsListeners.forEach((l) => l())
}

/* ---------------- REST helpers ---------------- */
function sbApi(path: string, opt: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(opt.headers as Record<string, string>),
    apikey: SYNC_ANON,
    'Content-Type': 'application/json',
  }
  return fetch(SYNC_URL + path, { ...opt, headers })
}
function sbParseJwt(t: string): { sub?: string } {
  try {
    const p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(p))))
  } catch {
    return {}
  }
}

/* Magic-link redirect: URL carries #access_token=…&refresh_token=… */
export function sbHandleRedirect(): boolean {
  if (!location.hash || location.hash.indexOf('access_token=') < 0) return false
  const q: Record<string, string> = {}
  location.hash
    .slice(1)
    .split('&')
    .forEach((kv) => {
      // split only on the FIRST '=' — JWTs carry '=' base64 padding
      const i = kv.indexOf('=')
      if (i > 0) q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1) || '')
    })
  if (!q.access_token || !q.refresh_token) return false
  const payload = sbParseJwt(q.access_token)
  const s: SbSession = {
    access_token: q.access_token,
    refresh_token: q.refresh_token,
    expires_at: Date.now() + +(q.expires_in || 3600) * 1000,
    uid: payload.sub || '',
    email: '',
  }
  sbSaveSession(s)
  try {
    history.replaceState(null, '', location.pathname + location.search)
  } catch {
    /* ignore */
  }
  sbApi('/auth/v1/user', { headers: { Authorization: 'Bearer ' + s.access_token } })
    .then((r) => (r.ok ? r.json() : null))
    .then((u) => {
      if (u && u.email) {
        const ss = sbSession()
        if (ss) {
          ss.email = u.email
          sbSaveSession(ss)
          paintBadge()
        }
      }
    })
    .catch(() => {})
  return true
}

/* Valid access token, auto-refreshing 60s before expiry. */
function sbToken(): Promise<string | null> {
  return new Promise((res) => {
    const s = sbSession()
    if (!s) {
      res(null)
      return
    }
    if (Date.now() < s.expires_at - 60000) {
      res(s.access_token)
      return
    }
    sbApi('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.access_token) {
          const p = sbParseJwt(d.access_token)
          s.access_token = d.access_token
          s.refresh_token = d.refresh_token || s.refresh_token
          s.expires_at = Date.now() + +(d.expires_in || 3600) * 1000
          if (p.sub) s.uid = p.sub
          sbSaveSession(s)
          res(s.access_token)
        } else {
          sbSignOut()
          res(null)
        }
      })
      .catch(() => res(null))
  })
}

export function sbSignOut() {
  try {
    localStorage.removeItem('wbSyncSession')
  } catch {
    /* ignore */
  }
  syncRemoteTs = 0
  setStatus('本地模式', false)
  paintBadge()
}

function paintBadge() {
  if (!syncReady()) {
    setStatus('本地模式', false)
    return
  }
  if (!sbSession()) setStatus('☁️ 点我开启同步', false)
}

/* ---------------- data (de)serialization ---------------- */
let applying = false
function syncPack(): Partial<WorkbenchData> {
  const s = useStore.getState()
  const o: Record<string, unknown> = {}
  DOMAINS.forEach((k) => (o[k] = s[k]))
  return o as Partial<WorkbenchData>
}
function applyRemote(rec: RemoteRec, quiet: boolean) {
  syncRemoteTs = rec.updated_at || 0
  const d = rec.data || {}
  const patch: Record<string, unknown> = {}
  DOMAINS.forEach((k) => {
    if (d[k] != null) patch[k] = d[k]
  })
  applying = true
  useStore.setState(patch)
  applying = false
  lsSet('wbSyncLocalTs', String(rec.updated_at || Date.now()))
  lsSet('wbSyncMerged', '1')
  setStatus('已同步 · 多设备', true)
  if (!quiet) toastSafe('已从云端同步 ✅')
}

/* ---------------- pull / push ---------------- */
let syncRemoteTs = 0
let syncBusy = false
let pushTimer: ReturnType<typeof setTimeout> | null = null

export function syncPull(quiet: boolean) {
  if (!syncReady() || syncBusy) return
  syncBusy = true
  sbToken().then((tok) => {
    if (!tok) {
      syncBusy = false
      paintBadge()
      return
    }
    const s = sbSession()!
    fetch(SYNC_URL + '/rest/v1/workbench?user_id=eq.' + s.uid + '&select=data,updated_at', {
      headers: { apikey: SYNC_ANON, Authorization: 'Bearer ' + tok },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: RemoteRec[] | null) => {
        syncBusy = false
        const rec = rows && rows[0]
        if (rec) {
          const remote = rec.updated_at || 0
          if (remote > syncRemoteTs) {
            const localTs = +(lsGet('wbSyncLocalTs') || 0)
            if (!lsGet('wbSyncMerged') && localTs > 0) {
              setFirstSync(rec)
              paintBadge()
              return
            }
            applyRemote(rec, quiet)
          }
        } else {
          syncPushNow() // cloud has no row yet: push local up
        }
        paintBadge()
      })
      .catch(() => {
        syncBusy = false
        setStatus('离线 · 本地已存', false)
      })
  })
}

export function syncPushNow() {
  if (!syncReady()) return
  sbToken().then((tok) => {
    if (!tok) {
      paintBadge()
      return
    }
    const s = sbSession()!
    const ts = Date.now()
    fetch(SYNC_URL + '/rest/v1/workbench', {
      method: 'POST',
      headers: {
        apikey: SYNC_ANON,
        Authorization: 'Bearer ' + tok,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{ user_id: s.uid, data: syncPack(), updated_at: ts }]),
    })
      .then((r) => {
        if (r.ok) {
          syncRemoteTs = ts
          lsSet('wbSyncLocalTs', String(ts))
          lsSet('wbSyncMerged', '1')
          setStatus('已同步 · 多设备', true)
        } else {
          setStatus('同步失败', false)
        }
      })
      .catch(() => setStatus('离线 · 本地已存', false))
  })
}

export function syncPushDebounced() {
  if (!syncReady()) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(syncPushNow, 1200)
}

/* First-sync conflict resolution. */
export function resolveFirstSync(choice: 'cloud' | 'local') {
  const rec = firstSyncRec
  setFirstSync(null)
  if (!rec) return
  if (choice === 'cloud') {
    applyRemote(rec, false)
  } else {
    lsSet('wbSyncMerged', '1')
    syncPushNow()
    toastSafe('正在把本机数据推到云端…')
  }
}

/* Send the magic-link email. */
export function sbSendEmail(email: string): Promise<boolean> {
  return sbApi('/auth/v1/otp', {
    method: 'POST',
    body: JSON.stringify({ email, create_user: true }),
  }).then((r) => r.ok)
}

/* ---------------- startup ---------------- */
let started = false
export function initSync() {
  if (!syncReady() || started) return
  started = true
  const loggedIn = sbHandleRedirect()
  paintBadge()
  if (loggedIn) toastSafe('登录成功!多设备同步已开启 🎉')
  syncPull(true)
  setInterval(() => syncPull(true), 30000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncPull(true)
  })
  // push local edits (debounced), skipping the writes made by applyRemote
  useStore.subscribe(() => {
    if (applying) return
    lsSet('wbSyncLocalTs', String(Date.now()))
    syncPushDebounced()
  })
}

/* ---------------- toast bridge ---------------- */
let toastFn: (m: string) => void = () => {}
export function registerToast(fn: (m: string) => void) {
  toastFn = fn
}
function toastSafe(m: string) {
  try {
    toastFn(m)
  } catch {
    /* ignore */
  }
}
