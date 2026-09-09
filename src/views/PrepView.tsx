import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useToast } from '../ui/toast'
import Modal from '../ui/Modal'
import MicButton from '../ui/MicButton'
import { holMap } from '../lib/holidays'
import { PREP_TYPES, WEEKDAY_CN } from '../lib/constants'
import {
  fmtDate,
  mmdd,
  parseDate,
  startOfWeek,
  todayStr,
  weekKeyOf,
  weekdayOf,
} from '../lib/date'
import type { PrepItem } from '../store/types'

const DOW = ['一', '二', '三', '四', '五', '六', '日']

interface WeekEntry {
  date: string
  item: PrepItem
}

export default function PrepView({ active }: { active: boolean }) {
  const lessonPrep = useStore((s) => s.lessonPrep)
  const todos = useStore((s) => s.todos)
  const addPrep = useStore((s) => s.addPrep)
  const delPrep = useStore((s) => s.delPrep)
  const toast = useToast()

  const now = new Date()
  const [calY, setCalY] = useState(now.getFullYear())
  const [calM, setCalM] = useState(now.getMonth())
  const [sheet, setSheet] = useState<string | null>(null) // selected date or null
  const [dayType, setDayType] = useState('备课')
  const [dayInput, setDayInput] = useState('')
  const [editing, setEditing] = useState<{ date: string; id: string } | null>(null)

  const [prepInput, setPrepInput] = useState('')
  const [prepDate, setPrepDate] = useState(todayStr())
  const [impInput, setImpInput] = useState('')

  const today = todayStr()

  // 42-cell month grid starting on the Monday on/before the 1st
  const cells = useMemo(() => {
    const first = new Date(calY, calM, 1)
    const offset = weekdayOf(first) - 1
    const start = new Date(calY, calM, 1 - offset)
    const out: { ds: string; date: Date; inM: boolean; wd: number }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push({ ds: fmtDate(d), date: d, inM: d.getMonth() === calM, wd: weekdayOf(d) })
    }
    return out
  }, [calY, calM])

  // current-week aggregations
  const { weekLabel, weekPrep, weekImp } = useMemo(() => {
    const wk = weekKeyOf(new Date())
    const end = new Date(startOfWeek(new Date()))
    end.setDate(end.getDate() + 6)
    const endStr = fmtDate(end)
    const prep: WeekEntry[] = []
    const imp: WeekEntry[] = []
    for (const ds in lessonPrep) {
      const dt = parseDate(ds)
      if (dt >= parseDate(wk) && dt <= parseDate(endStr)) {
        ;(lessonPrep[ds] || []).forEach((it) => {
          if ((it.type || '其他') === '会议') imp.push({ date: ds, item: it })
          else prep.push({ date: ds, item: it })
        })
      }
    }
    const bydate = (a: WeekEntry, b: WeekEntry) =>
      a.date.localeCompare(b.date) || (a.item.createdAt || 0) - (b.item.createdAt || 0)
    prep.sort(bydate)
    imp.sort(bydate)
    return { weekLabel: `(${mmdd(wk)} — ${mmdd(endStr)})`, weekPrep: prep, weekImp: imp }
  }, [lessonPrep])

  function prevMonth() {
    setCalM((m) => {
      if (m <= 0) {
        setCalY((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }
  function nextMonth() {
    setCalM((m) => {
      if (m >= 11) {
        setCalY((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }
  function gotoToday() {
    const d = new Date()
    setCalY(d.getFullYear())
    setCalM(d.getMonth())
  }

  function addQuick() {
    if (!prepInput.trim()) {
      toast('写点内容再记下呀 📝')
      return
    }
    const d = prepDate || today
    addPrep(d, prepInput.trim(), '备课')
    setPrepInput('')
    toast('已记到 ' + d + ' 📝')
  }
  function addImp() {
    if (!impInput.trim()) {
      toast('写点内容再添加 📝')
      return
    }
    addPrep(today, impInput.trim(), '会议')
    setImpInput('')
    toast('已加入本周重要事项 📌')
  }
  function addDay() {
    if (!dayInput.trim() || !sheet) {
      if (!dayInput.trim()) toast('写点内容再记下呀 📝')
      return
    }
    addPrep(sheet, dayInput.trim(), dayType)
    setDayInput('')
    toast('已记到 ' + sheet + (dayType === '会议' ? ' 的会议 📅' : ' 的备课 📝'))
  }

  const sheetList = sheet ? lessonPrep[sheet] || [] : []

  return (
    <section className={'view' + (active ? ' on' : '')}>
      <div className="prep-layout">
        <div className="prep-main">
          <div className="panel">
            <div className="cal-head">
              <button className="icon-btn" onClick={prevMonth}>
                ‹
              </button>
              <div className="month">
                {calY}年{calM + 1}月
              </div>
              <button className="icon-btn" onClick={nextMonth}>
                ›
              </button>
              <button className="btn ghost sm" onClick={gotoToday}>
                回到今天
              </button>
              <span
                className="sub"
                style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}
              >
                点日期 → 在右侧加备课
              </span>
            </div>
            <div className="cal-grid">
              {DOW.map((s, i) => (
                <div className={'cal-dow' + (i > 4 ? ' we' : '')} key={s}>
                  {s}
                </div>
              ))}
            </div>
            <div className="cal-grid">
              {cells.map(({ ds, date, inM, wd }, i) => {
                const items = lessonPrep[ds] || []
                const tdCount = todos.filter((t) => t.date === ds && !t.done).length
                const hol = holMap[ds]
                const cls =
                  'day' +
                  (inM ? '' : ' blank') +
                  (wd > 5 ? ' we' : '') +
                  (ds === today ? ' today' : '') +
                  (hol ? ' hol' : '')
                const types: Record<string, number> = {}
                items.forEach((it) => {
                  const t = it.type || '其他'
                  types[t] = (types[t] || 0) + 1
                })
                const typeKeys = Object.keys(types).slice(0, 3)
                return (
                  <div
                    className={cls}
                    key={ds + i}
                    onClick={() => {
                      if (!inM) return
                      setSheet(ds)
                      setDayType('备课')
                      setDayInput('')
                    }}
                  >
                    <div className="dnum">{date.getDate()}</div>
                    {inM && (
                      <>
                        {hol && <div className="hol-tag">{hol}</div>}
                        {items.length > 0 && (
                          <div className="prep-dots">
                            {typeKeys.map((t) => (
                              <span className={'pdot t-' + t} key={t}>
                                {t}
                              </span>
                            ))}
                            {items.length > 3 && (
                              <span className="pmore">+{Math.min(items.length - 3, 99)}</span>
                            )}
                          </div>
                        )}
                        {tdCount > 0 && (
                          <div className="todo-dots">
                            {Array.from({ length: Math.min(tdCount, 3) }).map((_, k) => (
                              <span className="tdot" key={k} />
                            ))}
                            {tdCount > 3 && <span className="todo-more">+{tdCount - 3}</span>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <aside className="prep-side">
          <div className="panel prep-side-panel">
            <h2>
              🎤 一句话速记 <span className="sub">回车即存到选中日期</span>
            </h2>
            <div className="row">
              <input
                className="input grow"
                placeholder="例:周三默写U3单词+讲U4语法…"
                value={prepInput}
                onChange={(e) => setPrepInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addQuick()}
              />
              <MicButton small onText={(t) => setPrepInput((v) => (v ? v + ' ' : '') + t)} />
              <button className="btn pu" onClick={addQuick}>
                记下
              </button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <span className="sub" style={{ fontSize: 12, color: 'var(--muted)' }}>
                归档到:
              </span>
              <input
                className="input"
                type="date"
                style={{ maxWidth: 170 }}
                value={prepDate}
                onChange={(e) => setPrepDate(e.target.value)}
              />
            </div>
          </div>

          <div className="panel prep-side-panel">
            <h2>
              📌 本周备课 <span className="sub">{weekLabel}</span>
            </h2>
            <div className="list-col">
              {weekPrep.length === 0 ? (
                <div className="empty">本周还没有备课事项</div>
              ) : (
                weekPrep.map((x) => (
                  <PrepRow
                    key={x.item.id}
                    entry={x}
                    onEdit={() => setEditing({ date: x.date, id: x.item.id })}
                    onDel={() => delPrep(x.date, x.item.id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="panel prep-side-panel">
            <h2>
              🗒️ 本周重要事项 <span className="sub">会 / 截止 / 公开课…</span>
            </h2>
            <div className="row" style={{ marginBottom: 8 }}>
              <input
                className="input grow"
                placeholder="例:周五下午教研会议…"
                value={impInput}
                onChange={(e) => setImpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addImp()}
              />
              <button className="btn pu sm" onClick={addImp}>
                添加
              </button>
            </div>
            <div className="list-col">
              {weekImp.length === 0 ? (
                <div className="empty">本周还没添加重要事项</div>
              ) : (
                weekImp.map((x) => (
                  <PrepRow
                    key={x.item.id}
                    entry={x}
                    meeting
                    onEdit={() => setEditing({ date: x.date, id: x.item.id })}
                    onDel={() => delPrep(x.date, x.item.id)}
                  />
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* bottom day sheet */}
      <div
        className={'mask' + (sheet ? ' on' : '')}
        onClick={() => setSheet(null)}
        style={{ display: sheet ? undefined : 'none' }}
      />
      <div className={'day-sheet' + (sheet ? ' open' : '')}>
        <div className="sheet-bar" />
        {sheet && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              {sheet} 星期{WEEKDAY_CN[parseDate(sheet).getDay()]}
              {holMap[sheet] ? ' · ' + holMap[sheet] : ''}
            </h3>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
              备课/会议都按日期归档 · 点文字可修改 · 一句话搞定 ✍️
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="input grow"
                placeholder="给这天加一条备课/任务…"
                value={dayInput}
                onChange={(e) => setDayInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDay()}
              />
              <MicButton small onText={(t) => setDayInput((v) => (v ? v + ' ' : '') + t)} />
              <button className="btn pu sm" onClick={addDay}>
                记下
              </button>
            </div>
            <div className="quick-tags" style={{ marginBottom: 10 }}>
              <span className="qt-hint">类型:</span>
              {PREP_TYPES.map((t) => (
                <button
                  key={t}
                  className={dayType === t ? 'active' : ''}
                  style={
                    dayType === t ? { background: 'var(--pu)', color: '#fff' } : undefined
                  }
                  onClick={() => setDayType(t)}
                >
                  {t === '讲' ? '讲新课' : t}
                </button>
              ))}
            </div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--pu)', margin: '6px 0' }}>
              🗒️ 当日备课清单
            </h4>
            <div className="list-col">
              {sheetList.length === 0 ? (
                <div className="empty">这天还没有备课/会议,先记第一条吧 ✏️</div>
              ) : (
                sheetList.map((it) => (
                  <div className="prep-item" key={it.id}>
                    <span className={'type' + ((it.type || '') === '会议' ? ' t-会议' : '')}>
                      {it.type || '其他'}
                    </span>
                    <span
                      className="txt"
                      title="点击修改"
                      onClick={() => setEditing({ date: sheet, id: it.id })}
                    >
                      {it.text}
                    </span>
                    <button className="del" onClick={() => delPrep(sheet, it.id)}>
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <EditPrep
            date={editing.date}
            id={editing.id}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </section>
  )
}

function PrepRow({
  entry,
  meeting,
  onEdit,
  onDel,
}: {
  entry: WeekEntry
  meeting?: boolean
  onEdit: () => void
  onDel: () => void
}) {
  return (
    <div className="prep-item">
      <span className={'type' + (meeting ? ' t-会议' : '')}>
        {meeting ? '会议' : entry.item.type || '其他'}
      </span>
      <span className="date">{mmdd(entry.date)}</span>
      <span className="txt" title="点击修改" onClick={onEdit}>
        {entry.item.text}
      </span>
      <button className="del" onClick={onDel}>
        ✕
      </button>
    </div>
  )
}

function EditPrep({ date, id, onDone }: { date: string; id: string; onDone: () => void }) {
  const lessonPrep = useStore((s) => s.lessonPrep)
  const editPrep = useStore((s) => s.editPrep)
  const toast = useToast()
  const it = (lessonPrep[date] || []).find((x) => x.id === id)
  const [type, setType] = useState(it?.type || '备课')
  const [text, setText] = useState(it?.text || '')
  if (!it) return null

  function save() {
    if (!text.trim()) {
      toast('内容不能为空 📝')
      return
    }
    editPrep(date, id, text.trim(), type)
    onDone()
    toast('已更新 ✅')
  }

  return (
    <>
      <h3>✎ 修改 · {mmdd(date)}</h3>
      <label>类型</label>
      <select
        className="input"
        style={{ margin: '6px 0 10px' }}
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        {PREP_TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <label>内容</label>
      <input
        className="input"
        style={{ margin: '6px 0 12px' }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onDone}>
          取消
        </button>
        <button className="btn pu" onClick={save}>
          保存
        </button>
      </div>
    </>
  )
}
