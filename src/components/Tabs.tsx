export type TabKey = 'schedule' | 'todos' | 'prep' | 'draw' | 'cd' | 'grp' | 'snd'

export const TABS: { v: TabKey; ico: string; label: string }[] = [
  { v: 'schedule', ico: '📚', label: '课程表' },
  { v: 'todos', ico: '📝', label: '待办提醒' },
  { v: 'prep', ico: '🗓️', label: '备课日历' },
  { v: 'draw', ico: '🎲', label: '课堂抽签' },
  { v: 'cd', ico: '⏱️', label: '课堂计时器' },
  { v: 'grp', ico: '🧩', label: '学生分层' },
  { v: 'snd', ico: '🔊', label: '声音互动' },
]

interface TabsProps {
  active: TabKey
  onChange: (v: TabKey) => void
}

export default function Tabs({ active, onChange }: TabsProps) {
  return (
    <nav className="tabs">
      {TABS.map((t) => (
        <button key={t.v} className={t.v === active ? 'active' : ''} onClick={() => onChange(t.v)}>
          <span className="ico">{t.ico}</span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}
