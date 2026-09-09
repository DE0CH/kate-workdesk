import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { useToast } from '../ui/toast'
import { CONFIG } from '../config'
import { hashStr } from '../lib/utils'

export const LOCK_DEF_HASH = hashStr(CONFIG.defaultLockPassword)

export function currentLockHash(): string {
  return useStore.getState().settings.lockHash || LOCK_DEF_HASH
}

interface LockScreenProps {
  locked: boolean
  onUnlock: () => void
}

export default function LockScreen({ locked, onUnlock }: LockScreenProps) {
  const lockHashStored = useStore((s) => s.settings.lockHash)
  const toast = useToast()
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(false)
  const [remember, setRemember] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const curHash = lockHashStored || LOCK_DEF_HASH

  useEffect(() => {
    if (locked) setTimeout(() => inputRef.current?.focus(), 80)
  }, [locked])

  function tryUnlock() {
    const v = pwd.trim()
    if (!v) {
      setErr('密码是空的,门可不开 🤨')
      return
    }
    if (hashStr(v) === curHash) {
      if (remember) {
        try {
          localStorage.setItem('wbLockOk', curHash)
          localStorage.setItem('wbLockTs', String(Date.now()))
        } catch {
          /* ignore */
        }
      }
      setPwd('')
      setErr('')
      onUnlock()
      toast(
        '欢迎回来' +
          (CONFIG.teacherName ? ',' + CONFIG.teacherName : '') +
          '!今天也是元气满满的一天 ☀️',
      )
    } else {
      setErr('密码不对,再想想喵 🚫')
      setShake(false)
      // retrigger the shake animation
      requestAnimationFrame(() => setShake(true))
      inputRef.current?.select()
    }
  }

  return (
    <div className={'lock' + (locked ? '' : ' off') + (shake ? ' shake' : '')}>
      <div className="lock-card">
        <div className="lock-emoji">🔐</div>
        <h2>{CONFIG.appName}上了锁</h2>
        <div className="lock-tip">输入密码才能进来喵 ✨</div>
        <input
          ref={inputRef}
          className="input"
          type="password"
          inputMode="numeric"
          placeholder="· · · ·"
          maxLength={12}
          autoComplete="off"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
        />
        <button className="btn pu lock-btn" onClick={tryUnlock}>
          开门 🚪
        </button>
        <label className="lock-remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          这台设备 7 天内免输密码
        </label>
        <div className="lock-err">{err}</div>
      </div>
    </div>
  )
}
