import { useEffect, useState, useSyncExternalStore } from 'react'
import Modal from '../ui/Modal'
import { useToast } from '../ui/toast'
import {
  syncReady,
  subscribeStatus,
  getStatus,
  subscribeFirstSync,
  getFirstSyncRec,
  initSync,
  registerToast,
  sbSession,
  sbSendEmail,
  sbSignOut,
  syncPull,
  syncPushNow,
  resolveFirstSync,
} from './sync'

/* ---- module-level panel controller (badge & footer both open it) ---- */
let panelOpen = false
const panelListeners = new Set<() => void>()
function setPanel(v: boolean) {
  panelOpen = v
  panelListeners.forEach((l) => l())
}
function usePanel() {
  return useSyncExternalStore(
    (cb) => {
      panelListeners.add(cb)
      return () => panelListeners.delete(cb)
    },
    () => panelOpen,
  )
}
export function openSyncPanel() {
  setPanel(true)
}

function useStatus() {
  return useSyncExternalStore(subscribeStatus, getStatus)
}
function useFirstSync() {
  return useSyncExternalStore(subscribeFirstSync, getFirstSyncRec)
}

export function SyncBadge() {
  const status = useStatus()
  if (!syncReady()) return null
  return (
    <div>
      <span
        className={'sync-badge' + (status.on ? '' : ' off')}
        onClick={openSyncPanel}
        role="button"
      >
        <span className="dot" />
        <span>{status.text}</span>
      </span>
    </div>
  )
}

export function SyncFooterButton() {
  if (!syncReady()) return null
  return <button onClick={openSyncPanel}>☁️ 多设备同步</button>
}

/** Runs sync startup and hosts the sign-in / settings / first-sync modals. */
export function SyncStartup() {
  const toast = useToast()
  const open = usePanel()
  const firstSync = useFirstSync()

  useEffect(() => {
    registerToast(toast)
    initSync()
  }, [toast])

  return (
    <>
      <Modal open={open} onClose={() => setPanel(false)}>
        <SyncPanel onClose={() => setPanel(false)} />
      </Modal>
      <Modal open={!!firstSync} onClose={() => resolveFirstSync('cloud')}>
        {firstSync && <FirstSyncPanel updatedAt={firstSync.updated_at || 0} />}
      </Modal>
    </>
  )
}

function SyncPanel({ onClose }: { onClose: () => void }) {
  const session = sbSession()
  if (session) return <SyncSettings session={session} onClose={onClose} />
  return <SyncLogin onClose={onClose} />
}

function SyncLogin({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [msgColor, setMsgColor] = useState('var(--gr)')

  function send() {
    const em = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      setMsgColor('var(--rd)')
      setMsg('邮箱格式看着不对哦 🤨')
      return
    }
    setMsgColor('var(--muted)')
    setMsg('发送中…')
    sbSendEmail(em)
      .then((ok) => {
        if (ok) {
          setMsgColor('var(--gr)')
          setMsg('✅ 已发送!去邮箱点邮件里的链接(标题类似 Confirm / Log In),点完会自动跳回这个页面')
        } else {
          setMsgColor('var(--rd)')
          setMsg('发送失败,60 秒内只能发一次,稍等再试')
        }
      })
      .catch(() => {
        setMsgColor('var(--rd)')
        setMsg('网络异常,稍后再试')
      })
  }

  return (
    <>
      <h3>☁️ 开启多设备同步</h3>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 }}>
        输入邮箱 → 去邮箱点一下登录链接 → 这台设备就长期保持同步了(<b>几个月不用再登</b>
        )。另一台设备用同一个邮箱登一次即可。
      </p>
      <input
        className="input"
        type="email"
        inputMode="email"
        placeholder="你的邮箱,如 you@example.com"
        style={{ fontSize: 16 }}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        autoFocus
      />
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn ghost" onClick={onClose}>
          取消
        </button>
        <button className="btn pu" onClick={send}>
          发送登录链接
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: msgColor, marginTop: 8, minHeight: 18, lineHeight: 1.6 }}>
        {msg}
      </div>
    </>
  )
}

function SyncSettings({
  session,
  onClose,
}: {
  session: { email: string }
  onClose: () => void
}) {
  const toast = useToast()
  return (
    <>
      <h3>☁️ 多设备同步</h3>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 }}>
        已登录账号:<b style={{ color: 'var(--ink)' }}>{session.email || '(获取中)'}</b>
        <br />
        另一台设备打开工作台,点右上角「☁️」用同一个邮箱登录即可自动同步。
      </p>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button
          className="btn ghost sm"
          onClick={() => {
            syncPull(false)
            onClose()
          }}
        >
          ⬇ 立即拉取
        </button>
        <button
          className="btn ghost sm"
          onClick={() => {
            syncPushNow()
            onClose()
            toast('正在上传…')
          }}
        >
          ⬆ 立即上传
        </button>
        <button
          className="btn danger sm"
          onClick={() => {
            if (confirm('退出后这台设备不再自动同步(本机数据保留)。确定退出?')) {
              onClose()
              sbSignOut()
              toast('已退出同步账号(本机数据保留)')
            }
          }}
        >
          退出登录
        </button>
      </div>
    </>
  )
}

function FirstSyncPanel({ updatedAt }: { updatedAt: number }) {
  const when = new Date(updatedAt).toLocaleString()
  return (
    <>
      <h3>☁️ 第一次同步,选一下方向</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 4 }}>
        云端已有一份数据(<b>{when}</b> 更新),而这台设备上也有数据。以哪份为准?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        <button className="btn pu" onClick={() => resolveFirstSync('cloud')}>
          用云端的(另一台设备的最新数据)
        </button>
        <button className="btn ghost" onClick={() => resolveFirstSync('local')}>
          用本机的(把这台设备的数据推上去)
        </button>
      </div>
    </>
  )
}
