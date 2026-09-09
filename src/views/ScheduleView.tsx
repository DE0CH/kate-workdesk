import { useState } from 'react'
import { useStore } from '../store/store'
import { useToast } from '../ui/toast'
import Modal from '../ui/Modal'
import { BELLS } from '../lib/constants'
import { WEEKDAY_CN } from '../lib/constants'

const clsShort = (c: string) => String(c || '').replace(/^七/, '')
const DAYS = ['一', '二', '三', '四', '五']

export default function ScheduleView({ active }: { active: boolean }) {
  const courses = useStore((s) => s.courses)
  const classNames = useStore((s) => s.settings.classNames)
  // Chip colour follows the class's position in the class list (0 → lilac, 1 → rose),
  // so any class names render correctly — not just the config defaults.
  const variantClass = (cls: string) => (classNames.indexOf(cls) % 2 === 1 ? 'cls-b' : 'cls-a')
  const [edit, setEdit] = useState<{ wd: number; p: string } | null>(null)

  return (
    <section className={'view' + (active ? ' on' : '')}>
      <div className="panel">
        <div className="cal-head">
          <div className="month">课程表</div>
          <span
            className="sub"
            style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}
          >
            点课程色块 ✎ 修改 / 点「＋」新增
          </span>
        </div>
        <div className="sched-wrap">
          <table className="sched-grid">
            <thead>
              <tr>
                <th className="col-time"></th>
                <th className="col-period"></th>
                {DAYS.map((d) => (
                  <th key={d}>星期{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BELLS.map((b) => {
                const aux = b.k === 'read' || b.k === 'ex'
                if (b.p === '午读') {
                  return (
                    <tr className="aux" key={b.p}>
                      <td className="col-time">{b.t}</td>
                      <td className="col-period">午读</td>
                      <td colSpan={5} className="bell-aux">
                        午 休
                      </td>
                    </tr>
                  )
                }
                if (b.p === '大课间') {
                  return (
                    <tr className="aux" key={b.p}>
                      <td className="col-time">{b.t}</td>
                      <td className="col-period">大课间</td>
                      <td colSpan={5} className="bell-aux">
                        大课间
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr className={aux ? 'aux' : ''} key={b.p}>
                    <td className="col-time">{b.t}</td>
                    <td className="col-period">{b.p}</td>
                    {[1, 2, 3, 4, 5].map((wd) => {
                      const c = (courses[wd] || []).find((x) => x.p === b.p)
                      let cls = 'schp '
                      if (c) {
                        cls += aux ? 'aux-cls' : variantClass(c.cls)
                      } else {
                        cls += aux ? 'aux-empty' : 'empty'
                      }
                      return (
                        <td key={wd}>
                          <div className={cls} onClick={() => setEdit({ wd, p: b.p })}>
                            {c ? clsShort(c.cls) : ''}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ScheduleNotes />

      <Modal open={!!edit} onClose={() => setEdit(null)}>
        {edit && <EditCourse wd={edit.wd} p={edit.p} onDone={() => setEdit(null)} />}
      </Modal>
    </section>
  )
}

function EditCourse({ wd, p, onDone }: { wd: number; p: string; onDone: () => void }) {
  const courses = useStore((s) => s.courses)
  const classNames = useStore((s) => s.settings.classNames)
  const setCourse = useStore((s) => s.setCourse)
  const delCourse = useStore((s) => s.delCourse)
  const existing = (courses[wd] || []).find((x) => x.p === p)
  const [cls, setCls] = useState(existing?.cls || classNames[0])
  const [name, setName] = useState(existing?.name ?? '英语')

  function save() {
    setCourse(wd, p, cls, name.trim() || '英语')
    onDone()
  }

  return (
    <>
      <h3>
        {existing ? '修改' : '添加'} · 星期{WEEKDAY_CN[wd]} · {p}
      </h3>
      <label>班级</label>
      <select
        className="input"
        style={{ margin: '6px 0 10px' }}
        value={cls}
        onChange={(e) => setCls(e.target.value)}
      >
        {classNames.map((cn) => (
          <option key={cn}>{cn}</option>
        ))}
      </select>
      <label>科目</label>
      <input
        className="input"
        style={{ margin: '6px 0 10px' }}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {existing && (
          <button
            className="btn danger"
            onClick={() => {
              delCourse(wd, p)
              onDone()
            }}
          >
            删除
          </button>
        )}
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

function ScheduleNotes() {
  const notes = useStore((s) => s.settings.scheduleNotes)
  const addNote = useStore((s) => s.addNote)
  const editNote = useStore((s) => s.editNote)
  const delNote = useStore((s) => s.delNote)
  const toast = useToast()
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState<{ i: number; text: string } | null>(null)

  function add() {
    if (!input.trim()) {
      toast('写点备注内容再添加 📝')
      return
    }
    addNote(input)
    setInput('')
  }

  return (
    <div className="panel">
      <h2>
        📌 备注 <span className="sub">调课 / 课时微调 · 一目了然</span>
      </h2>
      <div className="sched-notes">
        {notes.length === 0 ? (
          <div className="empty">暂无备注,加一条让课程表更清晰 ✍️</div>
        ) : (
          notes.map((n, i) => (
            <div className="nt" key={i}>
              <span className="ico">📌</span>
              <span className="txt">{n}</span>
              <button className="edit" title="修改" onClick={() => setEditing({ i, text: n })}>
                ✎
              </button>
              <button className="del" title="删除" onClick={() => delNote(i)}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <input
          className="input grow"
          placeholder="新增备注,例如:周三 第 3 节调到第 6 节"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn pu" onClick={add}>
          添加备注
        </button>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <>
            <h3>✎ 修改备注</h3>
            <input
              className="input"
              style={{ margin: '8px 0 12px' }}
              value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (!editing.text.trim()) {
                    toast('备注不能为空 📝')
                    return
                  }
                  editNote(editing.i, editing.text.trim())
                  setEditing(null)
                  toast('备注已更新 ✅')
                }
              }}
            />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setEditing(null)}>
                取消
              </button>
              <button
                className="btn pu"
                onClick={() => {
                  if (!editing.text.trim()) {
                    toast('备注不能为空 📝')
                    return
                  }
                  editNote(editing.i, editing.text.trim())
                  setEditing(null)
                  toast('备注已更新 ✅')
                }}
              >
                保存
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
