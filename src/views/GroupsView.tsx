import { useState } from 'react'
import { useStore } from '../store/store'
import { useToast } from '../ui/toast'
import Modal from '../ui/Modal'

const CARD_COLORS = ['#8b90d3', '#85aad4', '#d384a0', '#ec9f5f', '#d395a8']

type ModalState =
  | { kind: 'member'; gi: number; mi: number }
  | { kind: 'import' }
  | { kind: 'rank' }
  | null

export default function GroupsView({ active }: { active: boolean }) {
  const classNames = useStore((s) => s.settings.classNames)
  const groups = useStore((s) => s.groups)
  const setGroupField = useStore((s) => s.setGroupField)
  const resetGroups = useStore((s) => s.resetGroups)
  const toast = useToast()

  const [cls, setCls] = useState(classNames[0])
  const [modal, setModal] = useState<ModalState>(null)

  const gs = groups[cls] || []

  return (
    <section className={'view' + (active ? ' on' : '')}>
      <div className="panel">
        <h2>
          🧩 学生分层 <span className="sub">组间分层 · 各层任务不同 · 小组长负责制</span>
        </h2>
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="grp-tabs grow">
            {classNames.map((cn) => (
              <button
                key={cn}
                className={cn === cls ? 'active' : ''}
                onClick={() => setCls(cn)}
              >
                {cn}
              </button>
            ))}
          </div>
          <button className="btn ghost sm" onClick={() => setModal({ kind: 'import' })}>
            📥 导入名单
          </button>
          <button className="btn ghost sm" onClick={() => setModal({ kind: 'rank' })}>
            📊 按排名重排
          </button>
          <button
            className="btn ghost sm"
            onClick={() => {
              if (confirm('把 ' + cls + ' 重置为纯学号分组(1-50 平均分 5 组)?')) {
                resetGroups(cls)
                toast('已重置为学号分组 🔄')
              }
            }}
          >
            ↺ 重置学号分组
          </button>
        </div>
        <div className="grp-grid">
          {gs.map((g, gi) => {
            const c = CARD_COLORS[gi % 5]
            return (
              <div className="grp-card" key={g.key}>
                <div
                  className="grp-head"
                  style={{ background: `linear-gradient(135deg,${c},${c}cc)` }}
                >
                  <span className="gname">{g.key}组</span>
                  <span className="glv">{g.level}</span>
                </div>
                <div className="grp-body">
                  <label>👑 小组长(填学号或姓名)</label>
                  <input
                    className="input"
                    placeholder="例:5 或 王小明"
                    value={g.leader}
                    onChange={(e) => setGroupField(cls, gi, 'leader', e.target.value)}
                  />
                  <label>📋 本层任务</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="例:完成拓展阅读 2 篇并写 5 句话感想"
                    value={g.task}
                    onChange={(e) => setGroupField(cls, gi, 'task', e.target.value)}
                  />
                  <label>👥 组员(10 人,点击格子编辑)</label>
                  <div className="members">
                    {g.members.map((m, mi) => (
                      <div
                        className={'member' + (m.name ? ' has-name' : '')}
                        key={mi}
                        title="点击编辑"
                        onClick={() => setModal({ kind: 'member', gi, mi })}
                      >
                        {m.name || m.no}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)}>
        {modal?.kind === 'member' && (
          <MemberEditor cls={cls} gi={modal.gi} mi={modal.mi} onDone={() => setModal(null)} />
        )}
        {modal?.kind === 'import' && <ImportNames cls={cls} onDone={() => setModal(null)} />}
        {modal?.kind === 'rank' && <RankRegroup cls={cls} onDone={() => setModal(null)} />}
      </Modal>
    </section>
  )
}

function MemberEditor({
  cls,
  gi,
  mi,
  onDone,
}: {
  cls: string
  gi: number
  mi: number
  onDone: () => void
}) {
  const member = useStore((s) => s.groups[cls]?.[gi]?.members?.[mi])
  const setMember = useStore((s) => s.setMember)
  const [no, setNo] = useState(member?.no || '')
  const [name, setName] = useState(member?.name || '')
  if (!member) return null

  return (
    <>
      <h3>编辑组员</h3>
      <label>学号</label>
      <input
        className="input"
        style={{ margin: '4px 0 8px' }}
        value={no}
        onChange={(e) => setNo(e.target.value)}
      />
      <label>姓名(留空则显示学号)</label>
      <input
        className="input"
        style={{ margin: '4px 0 12px' }}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onDone}>
          取消
        </button>
        <button
          className="btn pu"
          onClick={() => {
            setMember(cls, gi, mi, no.trim() || member.no, name.trim())
            onDone()
          }}
        >
          保存
        </button>
      </div>
    </>
  )
}

function ImportNames({ cls, onDone }: { cls: string; onDone: () => void }) {
  const importNames = useStore((s) => s.importNames)
  const toast = useToast()
  const [txt, setTxt] = useState('')
  return (
    <>
      <h3>📥 导入 {cls} 名单</h3>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>
        每行一个学生,两种格式均可:
        <br />① <b>学号+姓名</b> 如: <code>1 王小明</code>　② <b>只写姓名</b>(按顺序自动分配
        1–50 号)
      </p>
      <textarea
        className="input"
        rows={8}
        placeholder={'1 王小明\n2 李小红\n3 张大力'}
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
      />
      <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
        也可以粘贴 Excel 复制出来的两列(学号 姓名),支持空格/逗号/制表符分隔
      </p>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn ghost" onClick={onDone}>
          取消
        </button>
        <button
          className="btn pu"
          onClick={() => {
            if (!txt.trim()) {
              toast('粘贴内容再点应用呀 😅')
              return
            }
            importNames(cls, txt)
            onDone()
            toast(cls + ' 名单已导入 ✅')
          }}
        >
          应用名单
        </button>
      </div>
    </>
  )
}

function RankRegroup({ cls, onDone }: { cls: string; onDone: () => void }) {
  const rankRegroup = useStore((s) => s.rankRegroup)
  const toast = useToast()
  const [txt, setTxt] = useState('')
  return (
    <>
      <h3>📊 {cls} 按排名重新分层</h3>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>
        按<b>成绩从高到低</b>粘贴学生(学号或姓名),每行一个。自动分成:A 组前 10 名 → B 组
        11–20 名 → … → E 组 41–50 名。
      </p>
      <textarea
        className="input"
        rows={8}
        placeholder={'第一名到第五十名,每行一个,例如:\n5\n王小明\n13\n李小红'}
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
      />
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn ghost" onClick={onDone}>
          取消
        </button>
        <button
          className="btn pu"
          onClick={() => {
            const lines = txt
              .trim()
              .split(/\n/)
              .map((s) => s.trim())
              .filter(Boolean)
            if (lines.length < 10) {
              toast('至少贴 10 个学生才能分层 😅')
              return
            }
            rankRegroup(cls, lines)
            onDone()
            toast('已按排名重新分层 🎯')
          }}
        >
          按排名重排
        </button>
      </div>
    </>
  )
}
