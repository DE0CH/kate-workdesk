import { useState } from 'react'
import { useStore } from '../store/store'
import { useToast } from '../ui/toast'
import Modal from '../ui/Modal'
import { daysLeft } from '../lib/date'
import { sortedCountdowns } from '../lib/countdowns'
import { CD_CAT_COLORS, CD_CATS } from '../lib/constants'

export default function CountdownStrip() {
  const countdowns = useStore((s) => s.countdowns)
  const removedCD = useStore((s) => s.settings.removedCD)
  const [managing, setManaging] = useState(false)

  const list = sortedCountdowns(countdowns, removedCD)
  const show = list.slice(0, 3)

  return (
    <>
      <div className="cd-strip">
        {show.length === 0 && <span className="cd-empty">暂无倒计时,点右侧「管理」添加 🎯</span>}
        {show.map((c) => {
          const dl = daysLeft(c.date)
          const passed = dl < 0
          return (
            <span
              key={c.id}
              className={'cd-mini cat-' + c.cat + (passed ? ' passed' : '')}
              style={{ background: CD_CAT_COLORS[c.cat] || '#989bc6' }}
              onClick={() => setManaging(true)}
            >
              <span className="days">{passed ? '已过' : dl === 0 ? '今天' : dl}</span>
              <span>
                {passed ? '' : dl === 0 ? '🎉 ' : '天 · '}
                {c.name}
              </span>
            </span>
          )
        })}
        <button className="btn ghost sm cd-manage" onClick={() => setManaging(true)}>
          ⏳ 管理
        </button>
      </div>
      <Modal open={managing} onClose={() => setManaging(false)}>
        <CountdownManager />
      </Modal>
    </>
  )
}

function CountdownManager() {
  const countdowns = useStore((s) => s.countdowns)
  const removedCD = useStore((s) => s.settings.removedCD)
  const addCountdown = useStore((s) => s.addCountdown)
  const delCountdown = useStore((s) => s.delCountdown)
  const toast = useToast()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [cat, setCat] = useState('假期')

  const list = sortedCountdowns(countdowns, removedCD)

  function add() {
    if (!name.trim() || !date) {
      toast('名称和日期都要填呀 📅')
      return
    }
    addCountdown(name.trim(), date, cat)
    setName('')
    setDate('')
    toast('已加入倒计时:' + name.trim() + ' ⏳')
  }

  return (
    <>
      <h3>⏳ 重要倒计时</h3>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 12,
          maxHeight: 300,
          overflowY: 'auto',
        }}
      >
        {list.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 12 }}>
            还没有倒计时,在下方添加一个 🎯
          </div>
        ) : (
          list.map((c) => {
            const dl = daysLeft(c.date)
            const passed = dl < 0
            return (
              <div className="cd-mng-row" key={c.id}>
                <span className="cat-dot" style={{ background: CD_CAT_COLORS[c.cat] || '#989bc6' }} />
                <span className="nm">{c.name}</span>
                <span className="dt">{c.date}</span>
                <span className="dl">{passed ? '已过' : dl === 0 ? '今天!' : dl + ' 天'}</span>
                <button className="del" onClick={() => delCountdown(c.id, !!c.built)}>
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>
      <div style={{ borderTop: '1px dashed var(--line)', paddingTop: 12 }}>
        <div className="row">
          <input
            className="input grow"
            placeholder="名称,如: 期中考试"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            type="date"
            style={{ maxWidth: 150 }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
        </div>
        <div className="row" style={{ marginTop: 8, justifyContent: 'space-between' }}>
          <select
            className="input"
            style={{ maxWidth: 130 }}
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            {CD_CATS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button className="btn pu" onClick={add}>
            添加
          </button>
        </div>
      </div>
    </>
  )
}
