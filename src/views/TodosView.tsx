import { useState } from 'react'
import { useStore } from '../store/store'
import { useToast } from '../ui/toast'
import MicButton from '../ui/MicButton'
import { daysLeft, mmdd, todayStr } from '../lib/date'
import { DONE_TEXTS, TODO_QUICK_TAGS } from '../lib/constants'
import { pick } from '../lib/utils'
import type { Todo } from '../store/types'

export default function TodosView({ active }: { active: boolean }) {
  const todos = useStore((s) => s.todos)
  const toggleTodo = useStore((s) => s.toggleTodo)
  const delTodo = useStore((s) => s.delTodo)
  const addTodo = useStore((s) => s.addTodo)
  const toast = useToast()

  const [input, setInput] = useState('')
  const [date, setDate] = useState(todayStr())

  const today = todayStr()
  const tdToday = todos.filter((x) => x.date <= today && !x.done)
  const over = tdToday.filter((x) => x.date < today)
  const due = tdToday.filter((x) => x.date === today)
  const future = todos
    .filter((x) => x.date > today && !x.done)
    .sort((a, b) => a.date.localeCompare(b.date))
  const done = todos
    .filter((x) => x.done)
    .sort((a, b) =>
      ((b.doneAt || b.id || '') + '').localeCompare((a.doneAt || a.id || '') + ''),
    )
    .slice(0, 30)

  function toggle(id: string) {
    const nowDone = toggleTodo(id)
    if (nowDone) toast(pick(DONE_TEXTS))
  }

  function add() {
    const ok = addTodo(date || today, input)
    if (!ok) {
      toast('写点内容再添加呀 😅')
      return
    }
    toast('已加入 ' + (date || today) + ' 的待办清单 📌')
    setInput('')
  }

  return (
    <section className={'view' + (active ? ' on' : '')}>
      <div className="panel">
        <h2>
          📌 今天要处理{' '}
          <span className="sub">
            今天 {due.length} 条 · 逾期 {over.length} 条
          </span>
        </h2>
        <div className="todo-strip">
          {tdToday.length === 0 ? (
            <div className="empty">今天暂无待办,清单空空心情满满 ☕</div>
          ) : (
            tdToday.map((t) => (
              <TodoRow key={t.id} t={t} today={today} onToggle={toggle} onDel={delTodo} />
            ))
          )}
        </div>
      </div>

      <div className="panel">
        <div
          className="row"
          style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
        >
          <h2 style={{ margin: 0 }}>
            🗓️ 未来待办 <span className="sub">即将到期 · 提前安排不慌张</span>
          </h2>
          <span className="sub" style={{ fontSize: 12, color: 'var(--muted)' }}>
            {future.length ? '共 ' + future.length + ' 条' : '0 条'}
          </span>
        </div>
        <div className="list-col">
          {future.length === 0 ? (
            <div className="empty">没有未来待办,享受当下 🌿</div>
          ) : (
            future.map((t) => (
              <div className="todo-row" key={t.id}>
                <button className="ck" onClick={() => toggle(t.id)}>
                  ✓
                </button>
                <span className="txt">{t.text}</span>
                <span className="date-tag">
                  {mmdd(t.date)} · 还有 {daysLeft(t.date)} 天
                </span>
                <button className="del" onClick={() => delTodo(t.id)}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel">
        <h2>
          ✅ 已完成 <span className="sub">最近 30 条 · 划掉依然在,随时可撤销</span>
        </h2>
        <div className="list-col">
          {done.length === 0 ? (
            <div className="empty">还没有划掉的待办,先去完成第一条 ✨</div>
          ) : (
            done.map((t) => (
              <div className="todo-row done" key={t.id}>
                <button className="ck" onClick={() => toggle(t.id)}>
                  ✓
                </button>
                <span className="txt">{t.text}</span>
                <span className="date-tag">{t.date === today ? '今天' : mmdd(t.date)}</span>
                <button className="del" title="撤销" onClick={() => toggle(t.id)}>
                  ↺
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel">
        <h2>
          📝 待办速记 <span className="sub">一句话 + 语音,日积月累心里有数</span>
        </h2>
        <div className="row">
          <input
            className="input grow"
            placeholder="输入待办,例如:批改1班听写本…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <MicButton onText={(t) => setInput((v) => (v ? v + ' ' : '') + t)} />
          <input
            className="input"
            type="date"
            style={{ maxWidth: 160 }}
            title="选择日期"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="btn pu" onClick={add}>
            添加
          </button>
        </div>
        <div className="quick-tags">
          <span className="qt-hint">快捷标签:</span>
          {TODO_QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setInput((v) => (v ? v + ' · ' : '') + tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function TodoRow({
  t,
  today,
  onToggle,
  onDel,
}: {
  t: Todo
  today: string
  onToggle: (id: string) => void
  onDel: (id: string) => void
}) {
  const ov = t.date < today
  return (
    <div className={'todo-row' + (ov ? ' over' : '')}>
      <button className="ck" onClick={() => onToggle(t.id)}>
        ✓
      </button>
      <span className="txt">{t.text}</span>
      <span className="date-tag">
        {ov ? '逾期 · ' : ''}
        {t.date === today ? '今天' : mmdd(t.date)}
      </span>
      <button className="del" onClick={() => onDel(t.id)}>
        ✕
      </button>
    </div>
  )
}
