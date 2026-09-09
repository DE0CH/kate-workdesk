import { useEffect, useRef, useState } from 'react'
import { useToast } from '../ui/toast'
import { toggleFullscreen, exitFullscreen } from '../lib/fullscreen'

type AudioCtor = typeof AudioContext

function getAudioCtor(): AudioCtor | null {
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }
  return w.AudioContext || w.webkitAudioContext || null
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

export default function TimerView({ active }: { active: boolean }) {
  const toast = useToast()

  const [total, setTotalState] = useState(300)
  const [left, setLeftState] = useState(300)
  const [startLabel, setStartLabel] = useState('开始')

  const totalRef = useRef(300)
  const leftRef = useRef(300)
  const runningRef = useRef(false)
  const ivRef = useRef<number | undefined>(undefined)
  const endRef = useRef(0)
  const beepCtxRef = useRef<AudioContext | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const setLeftVal = (v: number) => {
    leftRef.current = v
    setLeftState(v)
  }
  const setTotalVal = (v: number) => {
    totalRef.current = v
    setTotalState(v)
  }

  useEffect(() => () => window.clearInterval(ivRef.current), [])

  function beep() {
    try {
      let c = beepCtxRef.current
      if (!c) {
        const Ctor = getAudioCtor()
        if (!Ctor) return
        c = beepCtxRef.current = new Ctor()
      }
      if (c.state === 'suspended') c.resume()
      const o = c.createOscillator()
      const g = c.createGain()
      o.connect(g)
      g.connect(c.destination)
      o.frequency.value = 880
      g.gain.value = 0.25
      o.start()
      o.frequency.setValueAtTime(880, c.currentTime)
      o.frequency.exponentialRampToValueAtTime(660, c.currentTime + 0.5)
      o.stop(c.currentTime + 0.6)
    } catch {
      /* ignore */
    }
  }

  function timerStop(done: boolean) {
    runningRef.current = false
    window.clearInterval(ivRef.current)
    let t = '继续'
    if (!done && leftRef.current > 0) t = '开始'
    setStartLabel(t)
  }

  function timerStart() {
    if (runningRef.current) return
    if (leftRef.current <= 0) setLeftVal(totalRef.current)
    if (!beepCtxRef.current) {
      try {
        const Ctor = getAudioCtor()
        if (Ctor) beepCtxRef.current = new Ctor()
      } catch {
        /* ignore */
      }
    }
    if (beepCtxRef.current && beepCtxRef.current.state === 'suspended') beepCtxRef.current.resume()
    runningRef.current = true
    endRef.current = Date.now() + leftRef.current * 1000
    setStartLabel('进行中')
    ivRef.current = window.setInterval(() => {
      const nl = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setLeftVal(nl)
      if (nl <= 0) {
        timerStop(true)
        beep()
        toast('⏰ 时间到!放下笔,抬起头来')
        try {
          exitFullscreen()
        } catch {
          /* ignore */
        }
      }
    }, 200)
  }

  function onQuick(min: number) {
    const v = min * 60
    setTotalVal(v)
    setLeftVal(v)
    runningRef.current = false
    window.clearInterval(ivRef.current)
    setStartLabel('开始')
  }

  function onReset() {
    runningRef.current = false
    window.clearInterval(ivRef.current)
    setLeftVal(totalRef.current)
  }

  const over = left <= 10
  const barWidth = (total ? (left / total) * 100 : 0) + '%'

  return (
    <section ref={sectionRef} className={'view' + (active ? ' on' : '')} id="view-cd">
      <div className="panel">
        <h2>
          ⏱ 课堂计时器 <span className="sub">投屏倒计时,练习不超时</span>
        </h2>
        <div className="timer-wrap">
          <div className={'timer-num' + (over ? ' over' : '')} id="timerNum">
            {fmt(left)}
          </div>
          <div className="timer-bar">
            <i id="timerBar" style={{ width: barWidth }}></i>
          </div>
          <div className="timer-quick">
            {[1, 3, 5, 10, 15].map((m) => (
              <button className="btn ghost" data-min={m} key={m} onClick={() => onQuick(m)}>
                {m} 分钟
              </button>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
            <button
              className="btn pu"
              id="timerStart"
              onClick={() => (runningRef.current ? timerStop(false) : timerStart())}
            >
              {startLabel}
            </button>
            <button className="btn ghost" id="timerPause" onClick={() => timerStop(false)}>
              暂停
            </button>
            <button className="btn ghost" id="timerReset" onClick={onReset}>
              重置
            </button>
            <button className="btn ghost" id="timerFs" onClick={() => toggleFullscreen(sectionRef.current)}>
              ⛶ 全屏
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
