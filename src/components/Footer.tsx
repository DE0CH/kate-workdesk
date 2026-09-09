import { useState } from 'react'
import { useStore } from '../store/store'
import { useToast } from '../ui/toast'
import Modal from '../ui/Modal'
import { hashStr } from '../lib/utils'
import { todayStr } from '../lib/date'
import type { WorkbenchData } from '../store/types'
import { SyncFooterButton } from '../sync/SyncUI'
import { syncReady } from '../sync/sync'

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

export default function Footer() {
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)
  const toast = useToast()
  const [lockOpen, setLockOpen] = useState(false)

  function exportBackup() {
    const s = useStore.getState()
    const data: Record<string, unknown> = {}
    DOMAINS.forEach((k) => (data[k] = s[k]))
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = '教师工作台备份-' + todayStr() + '.json'
    a.click()
    toast('备份已导出 💾')
  }

  function importBackup() {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = '.json'
    inp.onchange = () => {
      const f = inp.files?.[0]
      if (!f) return
      const r = new FileReader()
      r.onload = () => {
        try {
          const d = JSON.parse(String(r.result))
          if (!confirm('导入备份会覆盖当前数据,确定吗?')) return
          importData(d)
          toast('备份已恢复 ✅')
        } catch {
          toast('文件格式不对 😅')
        }
      }
      r.readAsText(f)
    }
    inp.click()
  }

  return (
    <div className="foot">
      {syncReady() ? '数据云端自动同步' : '数据保存在本机浏览器'} · 声音只在本地分析,绝不上传
      <br />
      <button onClick={exportBackup}>导出备份</button> ·{' '}
      <button onClick={importBackup}>导入备份</button> ·{' '}
      {syncReady() && (
        <>
          <SyncFooterButton /> ·{' '}
        </>
      )}
      <button
        onClick={() => {
          if (
            confirm('⚠️ 清空所有数据(课表/待办/分层/倒计时)?此操作不可恢复,建议先导出备份!')
          ) {
            resetAll()
            toast('已清空,重新开始 🌱')
          }
        }}
      >
        清空数据
      </button>{' '}
      · <button onClick={() => setLockOpen(true)}>🔒 门锁设置</button>
      <Modal open={lockOpen} onClose={() => setLockOpen(false)}>
        <LockSettings onDone={() => setLockOpen(false)} />
      </Modal>
    </div>
  )
}

function LockSettings({ onDone }: { onDone: () => void }) {
  const setLockHash = useStore((s) => s.setLockHash)
  const toast = useToast()
  const [a, setA] = useState('')
  const [b, setB] = useState('')

  function save() {
    if (a.trim().length < 4) {
      toast('密码至少 4 位哦 🔐')
      return
    }
    if (a.trim() !== b.trim()) {
      toast('两次输入不一样,再检查下 👀')
      return
    }
    const h = hashStr(a.trim())
    setLockHash(h)
    try {
      localStorage.setItem('wbLockOk', h)
    } catch {
      /* ignore */
    }
    onDone()
    toast('密码已更新,新密码立刻生效 ✅')
  }

  return (
    <>
      <h3>🔒 门锁设置</h3>
      <label>新密码(4-12位,建议别用生日)</label>
      <input
        className="input"
        type="password"
        maxLength={12}
        style={{ margin: '6px 0 10px' }}
        placeholder="输入新密码"
        value={a}
        onChange={(e) => setA(e.target.value)}
      />
      <label>再输一遍确认</label>
      <input
        className="input"
        type="password"
        maxLength={12}
        style={{ margin: '6px 0 10px' }}
        placeholder="再输一次"
        value={b}
        onChange={(e) => setB(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onDone}>
          取消
        </button>
        <button className="btn pu" onClick={save}>
          改密码
        </button>
      </div>
    </>
  )
}
