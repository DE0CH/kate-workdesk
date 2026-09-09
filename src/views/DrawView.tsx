import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { useToast } from '../ui/toast'
import { toggleFullscreen } from '../lib/fullscreen'
import { HIT_TEXTS } from '../lib/constants'
import { rand } from '../lib/utils'

export default function DrawView({ active }: { active: boolean }) {
  const history = useStore((s) => s.draw.history)
  const applyDraw = useStore((s) => s.applyDraw)
  const resetDraw = useStore((s) => s.resetDraw)
  const toast = useToast()

  const [noRepeat, setNoRepeat] = useState(true)
  const [num, setNum] = useState('?')
  const [fb, setFb] = useState('点击「抽一个」开始命运轮盘')
  const [rolling, setRolling] = useState(false)
  const [numFontSize, setNumFontSize] = useState<string | undefined>(undefined)

  const rollingRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => () => window.clearInterval(timerRef.current), [])

  function drawPool(): number[] {
    const used = useStore.getState().draw.used
    const pool: number[] = []
    for (let i = 1; i <= 50; i++) if (!(noRepeat && used.indexOf(i) >= 0)) pool.push(i)
    return pool
  }

  function doDraw() {
    if (rollingRef.current) return
    const pool = drawPool()
    if (!pool.length) {
      toast('1–50 都抽完啦!点「重置」重新开始 🔄')
      return
    }
    rollingRef.current = true
    setRolling(true)
    setFb('命运轮盘转动中…')
    let frames = 0
    const total = 22 + rand(10)
    timerRef.current = window.setInterval(() => {
      setNum(String(pool[rand(pool.length)]))
      frames++
      if (frames > total) {
        window.clearInterval(timerRef.current)
        const p = pool[rand(pool.length)]
        setNum(String(p))
        setNumFontSize(undefined)
        setRolling(false)
        applyDraw([p])
        setFb(HIT_TEXTS[rand(HIT_TEXTS.length)])
        rollingRef.current = false
      }
    }, 55)
  }

  function doMulti(n: number) {
    if (rollingRef.current) return
    const pool = drawPool()
    if (pool.length < n) {
      toast('剩下 ' + pool.length + ' 个,不够抽 ' + n + ' 个啦 😅')
      return
    }
    rollingRef.current = true
    setRolling(true)
    setFb('连抽 ' + n + ' 个…')
    let frames = 0
    const total = 20
    timerRef.current = window.setInterval(() => {
      setNum(String(pool[rand(pool.length)]))
      frames++
      if (frames > total) {
        window.clearInterval(timerRef.current)
        const used: Record<number, 1> = {}
        useStore.getState().draw.used.forEach((x) => (used[x] = 1))
        const picks: number[] = []
        while (picks.length < n) {
          const p = pool[rand(pool.length)]
          if (!used[p]) {
            used[p] = 1
            picks.push(p)
          }
        }
        applyDraw(picks)
        setNum(picks.join(' · '))
        setNumFontSize(picks.length > 2 ? '44px' : undefined)
        setRolling(false)
        setFb('一口气抽出 ' + n + ' 位幸运儿 🎉')
        rollingRef.current = false
      }
    }, 55)
  }

  function doReset() {
    resetDraw()
    toast('抽签已重置,新的一轮开始 🔄')
  }

  const hist = history.slice(0, 15)

  return (
    <section ref={sectionRef} className={'view' + (active ? ' on' : '')} id="view-draw">
      <div className="panel">
        <h2>
          🎲 课堂抽签 <span className="sub">1–50 号 · 全班公平抽</span>
        </h2>
        <div className="draw-stage">
          <div
            className={'draw-num' + (rolling ? ' rolling' : '')}
            id="drawNum"
            style={numFontSize ? { fontSize: numFontSize } : undefined}
          >
            {num}
          </div>
          <div className="draw-feedback" id="drawFb">
            {fb}
          </div>
          <div className="draw-btns">
            <button className="btn pu" id="drawOne" onClick={doDraw}>
              抽一个
            </button>
            <button className="btn ghost" id="drawMulti2" onClick={() => doMulti(2)}>
              连抽 2
            </button>
            <button className="btn ghost" id="drawMulti3" onClick={() => doMulti(3)}>
              连抽 3
            </button>
            <button className="btn ghost" id="drawMulti5" onClick={() => doMulti(5)}>
              连抽 5
            </button>
            <button className="btn ghost" id="drawReset" onClick={doReset}>
              重置
            </button>
            <button className="btn ghost" id="drawFs" onClick={() => toggleFullscreen(sectionRef.current)}>
              ⛶ 全屏
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <label
              style={{
                fontSize: 12.5,
                color: 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                id="drawNoRepeat"
                checked={noRepeat}
                onChange={(e) => setNoRepeat(e.target.checked)}
              />{' '}
              不重复模式（抽过的不再抽）
            </label>
          </div>
          <div className="draw-hist" id="drawHist">
            {hist.length ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: '38px' }}>
                  最近抽取:&nbsp;
                </span>
                {hist.map((x, i) => (
                  <span className="h" key={i}>
                    {x}
                  </span>
                ))}
              </>
            ) : (
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>还没有抽签记录,去抽一个吧</span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
