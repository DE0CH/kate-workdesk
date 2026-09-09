import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { useToast } from '../ui/toast'
import { toggleFullscreen } from '../lib/fullscreen'

type AudioCtor = typeof AudioContext

function getAudioCtor(): AudioCtor | null {
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }
  return w.AudioContext || w.webkitAudioContext || null
}

interface Fish {
  x: number
  y: number
  vx: number
  vy: number
  s: number
  c: string
  flip: boolean
  agit: number
  burst: number
}

const FISH_COUNT = 5
const FISH_COLORS = ['#f0a58f', '#93c6ef', '#f2b8ce', '#f5dfa0', '#a9d3b4', '#c9cdee']

function newFish(i: number): Fish {
  return {
    x: Math.random() * 0.8 + 0.1,
    y: 0.3 + Math.random() * 0.55,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.4,
    s: 0.7 + Math.random() * 0.7,
    c: FISH_COLORS[i % FISH_COLORS.length],
    flip: Math.random() < 0.5,
    agit: 0,
    burst: 0,
  }
}

function fmtClock(sec: number): string {
  const s = Math.floor(sec)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0')
}

export default function SoundView({ active }: { active: boolean }) {
  const sound = useStore((s) => s.sound)
  const setSound = useStore((s) => s.setSound)
  const toast = useToast()

  const mode = sound.mode
  const [audioOn, setAudioOn] = useState(false)

  // Mutable, non-render state.
  const soundRef = useRef(sound)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioOnRef = useRef(false)
  const levelRef = useRef(0)
  const dbNowRef = useRef(30)
  const lastLoopTRef = useRef(0)
  const rafRef = useRef<number | undefined>(undefined)

  const ballGoodSecRef = useRef(0)
  const fishRef = useRef<Fish[]>([])
  const fishQuietSecRef = useRef(0)
  const fctxRef = useRef<CanvasRenderingContext2D | null>(null)

  // DOM refs mutated directly for 60fps.
  const sectionRef = useRef<HTMLElement>(null)
  const fishCanvasRef = useRef<HTMLCanvasElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const sndDbRef = useRef<HTMLSpanElement>(null)
  const hud2Ref = useRef<HTMLDivElement>(null)
  const coreRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const ballDbRef = useRef<HTMLDivElement>(null)
  const progRef = useRef<HTMLDivElement>(null)
  const progTxtRef = useRef<HTMLSpanElement>(null)
  const goalRef = useRef<HTMLSpanElement>(null)
  const sensRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    soundRef.current = sound
  }, [sound])

  /* ---------------- fish ---------------- */
  function initFish() {
    const arr: Fish[] = []
    for (let i = 0; i < FISH_COUNT; i++) arr.push(newFish(i))
    fishRef.current = arr
    const canvas = fishCanvasRef.current
    if (canvas) {
      fctxRef.current = canvas.getContext('2d')
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
  }

  function drawFish(loud: number) {
    const fctx = fctxRef.current
    const canvas = fishCanvasRef.current
    if (!fctx || !canvas) return
    const w = canvas.width
    const h = canvas.height
    fctx.clearRect(0, 0, w, h)
    fctx.fillStyle = 'rgba(255,255,255,.4)'
    for (let b = 0; b < 8; b++) {
      const t = (Date.now() / 3000 + b * 1.3) % 1
      fctx.beginPath()
      fctx.arc(w * (0.15 + b * 0.1), h * (1 - t * 0.8), 3 + (b % 3), 0, 7)
      fctx.fill()
    }
    fctx.strokeStyle = '#85ab8f'
    fctx.lineWidth = 4
    fctx.lineCap = 'round'
    for (let k = 0; k < 3; k++) {
      const bx = w * (0.08 + k * 0.45)
      const sw = Math.sin(Date.now() / 900 + k)
      fctx.beginPath()
      fctx.moveTo(bx, h)
      fctx.quadraticCurveTo(bx + sw * 8, h * 0.7, bx + sw * 14, h * 0.55)
      fctx.stroke()
    }
    fishRef.current.forEach((f) => {
      if (loud) {
        f.burst = Math.min(6, f.burst + 0.25)
      } else f.burst = Math.max(0, f.burst - 0.08)
      f.vx += (Math.random() - 0.5) * 0.5
      f.vy += (Math.random() - 0.5) * 0.4
      const sp = 0.6 + f.burst * 2.2
      f.vx = Math.max(-sp, Math.min(sp, f.vx))
      f.vy = Math.max(-sp, Math.min(sp, f.vy))
      f.x += f.vx * 0.01 * (1 + f.burst * 2)
      f.y += f.vy * 0.01 * (1 + f.burst * 2)
      if (f.x < 0.05 || f.x > 0.95) f.vx *= -1
      if (f.y < 0.12 || f.y > 0.9) f.vy *= -1
      const px = f.x * w
      const py = f.y * h
      const sz = f.s * 22
      f.flip = f.vx > 0 ? false : f.vx < 0 ? true : f.flip
      fctx.save()
      fctx.translate(px, py)
      if (f.flip) fctx.scale(-1, 1)
      fctx.fillStyle = f.c
      fctx.beginPath()
      fctx.moveTo(-sz * 1.15, 0)
      fctx.lineTo(-sz * 1.5, -sz * 0.45)
      fctx.lineTo(-sz * 1.25, 0)
      fctx.lineTo(-sz * 1.5, sz * 0.45)
      fctx.closePath()
      fctx.fill()
      fctx.beginPath()
      fctx.ellipse(0, 0, sz, sz * 0.55, 0, 0, 7)
      fctx.fill()
      fctx.beginPath()
      fctx.ellipse(-sz * 0.5, -sz * 0.25, sz * 0.18, sz * 0.3, -0.6, 0, 7)
      fctx.fill()
      fctx.fillStyle = '#fff'
      fctx.beginPath()
      fctx.arc(sz * 0.55, -sz * 0.1, sz * 0.16, 0, 7)
      fctx.fill()
      fctx.fillStyle = '#1f2937'
      fctx.beginPath()
      fctx.arc(sz * 0.62, -sz * 0.1, sz * 0.085, 0, 7)
      fctx.fill()
      fctx.restore()
    })
    fctx.fillStyle = 'rgba(255,255,255,.06)'
    fctx.beginPath()
    fctx.moveTo(0, 0)
    fctx.lineTo(w * 0.2, 0)
    fctx.lineTo(w * 0.3, h)
    fctx.lineTo(0, h)
    fctx.closePath()
    fctx.fill()
  }

  function updateFish(dt: number) {
    const q = soundRef.current.quiet
    const sc = statusRef.current
    if (!audioOnRef.current) {
      if (sc) sc.textContent = '点击「开始监测」启用麦克风'
      drawFish(0)
      return
    }
    const loud = dbNowRef.current > q
    if (loud) {
      fishQuietSecRef.current = Math.max(0, fishQuietSecRef.current - dt)
      if (sc) {
        sc.textContent = '📢 有点吵!小鱼都被吓跑啦,安静下来它们就回来'
        sc.style.color = '#c96a6a'
      }
    } else {
      fishQuietSecRef.current += dt
      if (sc) {
        sc.textContent = '全班静悄悄,小鱼排排游 🐟'
        sc.style.color = '#6f8f7a'
      }
    }
    const target = Math.min(15, 5 + Math.floor(fishQuietSecRef.current / 60))
    const fish = fishRef.current
    if (target > fish.length) {
      for (let k = fish.length; k < target; k++) fish.push(newFish(k))
    }
    if (target < fish.length) fish.length = target
    drawFish(loud ? 1 : 0)
    if (hud2Ref.current) {
      hud2Ref.current.textContent = '🐟 ×' + fish.length + ' · 安静 ' + fmtClock(fishQuietSecRef.current)
    }
  }

  /* ---------------- ball ---------------- */
  function updateBall(dt: number) {
    const thr = soundRef.current.threshold
    const level = levelRef.current
    const dbNow = dbNowRef.current
    const h = level * 70
    if (coreRef.current)
      coreRef.current.style.transform =
        'translateY(-' + h + 'px) scale(' + (1 + level * 0.1) + ',' + (1 - level * 0.05) + ')'
    if (glowRef.current) glowRef.current.style.opacity = String(0.5 + level * 0.5)
    if (shadowRef.current) {
      shadowRef.current.style.transform = 'scale(' + (1 - level * 0.45) + ')'
      shadowRef.current.style.opacity = String(0.4 - level * 0.25)
    }
    if (ballDbRef.current)
      ballDbRef.current.innerHTML = dbNow + ' <span style="font-size:13px;color:#8a87ad">dB</span>'
    const st = statusRef.current
    if (st) {
      if (!audioOnRef.current) {
        st.textContent = '点击「开始监测」启用麦克风'
      } else if (dbNow >= thr) {
        st.textContent = '太棒了!声浪冲天 🌊'
        st.style.color = '#6b6fae'
      } else if (dbNow >= thr - 10) {
        st.textContent = '不错,再大声一点!📢'
        st.style.color = '#a97b4f'
      } else {
        st.textContent = '太安静啦,大声读出来!🤫'
        st.style.color = '#6b7280'
      }
    }
    if (audioOnRef.current) {
      if (dbNow >= thr) {
        ballGoodSecRef.current += dt
        if (ballGoodSecRef.current >= 60) {
          ballGoodSecRef.current = 0
          toast('🎉 朗读达标 1 分钟!全班超棒!')
        }
      } else ballGoodSecRef.current = Math.max(0, ballGoodSecRef.current - dt * 0.25)
    }
    if (progRef.current) progRef.current.style.width = Math.min(100, (ballGoodSecRef.current / 60) * 100) + '%'
    if (progTxtRef.current) progTxtRef.current.textContent = Math.floor(ballGoodSecRef.current) + ' / 60 秒'
  }

  /* ---------------- audio ---------------- */
  function audioLoop() {
    if (!audioOnRef.current) return
    const now = performance.now()
    const dt = lastLoopTRef.current ? (now - lastLoopTRef.current) / 1000 : 0.033
    lastLoopTRef.current = now
    const analyser = analyserRef.current
    const data = audioDataRef.current
    if (!analyser || !data) return
    analyser.getByteFrequencyData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]
    const avg = sum / data.length / 255
    const sens = soundRef.current.sens / 100
    levelRef.current = Math.min(1, avg * sens)
    dbNowRef.current = Math.round(30 + levelRef.current * 70)
    if (sndDbRef.current) sndDbRef.current.textContent = dbNowRef.current + ' dB'
    if (soundRef.current.mode === 'ball') updateBall(dt)
    else updateFish(dt)
    rafRef.current = requestAnimationFrame(audioLoop)
  }

  function startSound() {
    if (audioOnRef.current) return
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('此浏览器不支持麦克风。用 iPad 的 Safari 或电脑 Chrome 打开(需 https 链接) 📱')
      return
    }
    setAudioOn(true)
    try {
      const Ctor = getAudioCtor()
      audioCtxRef.current = Ctor ? new Ctor() : null
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    } catch {
      audioCtxRef.current = null
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream
        if (!audioCtxRef.current) {
          const Ctor = getAudioCtor()
          audioCtxRef.current = Ctor ? new Ctor() : null
        }
        if (!audioCtxRef.current) return
        const src = audioCtxRef.current.createMediaStreamSource(stream)
        const analyser = audioCtxRef.current.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.5
        src.connect(analyser)
        analyserRef.current = analyser
        audioDataRef.current = new Uint8Array(analyser.frequencyBinCount)
        audioOnRef.current = true
        toast('麦克风已开启,开始检测 🔊')
        rafRef.current = requestAnimationFrame(audioLoop)
      })
      .catch(() => {
        setAudioOn(false)
        toast('麦克风被拒绝了。检查权限,或换 https 链接打开 🎤')
      })
  }

  function stopSound() {
    audioOnRef.current = false
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
      analyserRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setAudioOn(false)
    toast('已停止监测')
  }

  function setSoundMode(m: 'ball' | 'fish') {
    setSound({ mode: m })
    soundRef.current = { ...soundRef.current, mode: m }
  }

  // Init / re-init the fish scene whenever we enter fish mode.
  useEffect(() => {
    if (mode === 'fish') initFish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Resize handler + unmount cleanup.
  useEffect(() => {
    const onResize = () => {
      const canvas = fishCanvasRef.current
      if (fctxRef.current && canvas) {
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight
      }
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      audioOnRef.current = false
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  // The ball scene is built ONCE so React never re-renders it — the animation
  // loop mutates its DOM nodes directly via refs (like the original innerHTML).
  const ballContent = useMemo(
    () => (
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '52%',
          transform: 'translate(-50%,-50%)',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div
          ref={glowRef}
          id="ballGlow"
          style={{
            width: 170,
            height: 170,
            margin: '0 auto',
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(139,92,246,.35),transparent 68%)',
            filter: 'blur(6px)',
          }}
        />
        <div
          ref={coreRef}
          id="ballCore"
          style={{
            position: 'relative',
            width: 128,
            height: 128,
            margin: '-150px auto 0',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 32% 28%,#fff 0%,#ded9f7 16%,#a3a8e0 55%,#5f6499 100%)',
            boxShadow:
              '0 18px 36px rgba(110,110,175,.35),inset -14px -16px 30px rgba(60,60,110,.25),inset 10px 10px 20px rgba(255,255,255,.45)',
          }}
        />
        <div
          ref={shadowRef}
          id="ballShadow"
          style={{
            position: 'relative',
            margin: '-12px auto 0',
            width: 96,
            height: 15,
            borderRadius: '50%',
            background: 'rgba(140,140,190,.4)',
            filter: 'blur(6px)',
          }}
        />
        <div ref={ballDbRef} id="ballDb" style={{ marginTop: 22, fontSize: 30, fontWeight: 800, color: '#5f6499' }}>
          {'-- '}
          <span style={{ fontSize: 13, color: '#8a87ad' }}>dB</span>
        </div>
        <div style={{ fontSize: 12, color: '#8a87ad', marginTop: 2 }}>
          达标线 <span ref={goalRef} id="ballGoal">{soundRef.current.threshold}</span> dB · 灵敏度{' '}
          <span ref={sensRef} id="ballSens">{soundRef.current.sens}</span>%
        </div>
        <div style={{ maxWidth: 300, margin: '10px auto 0', textAlign: 'left' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11.5,
              color: '#8a87ad',
              marginBottom: 4,
            }}
          >
            <span>朗读达标进度</span>
            <span ref={progTxtRef} id="ballProgTxt">
              0 / 60 秒
            </span>
          </div>
          <div style={{ height: 9, borderRadius: 5, background: '#e9e9f5', overflow: 'hidden' }}>
            <div
              ref={progRef}
              id="ballProg"
              style={{
                height: 9,
                width: 0,
                background: 'linear-gradient(90deg,#a3a8e0,#c9cdee)',
                borderRadius: 5,
                transition: 'width .2s',
              }}
            />
          </div>
        </div>
      </div>
    ),
    [],
  )

  return (
    <section ref={sectionRef} className={'view' + (active ? ' on' : '')} id="view-snd">
      <div className="panel">
        <h2>
          🔊 课堂声音互动 <span className="sub">早读大声读 · 延时安静做</span>
        </h2>
        <div className="snd-mode">
          <button
            className={mode === 'ball' ? 'active' : undefined}
            data-mode="ball"
            onClick={() => setSoundMode('ball')}
          >
            🎈 音浪球 · 早读
          </button>
          <button
            className={mode === 'fish' ? 'active' : undefined}
            data-mode="fish"
            onClick={() => setSoundMode('fish')}
          >
            🐠 安静养小鱼 · 延时
          </button>
        </div>
        <div className={'snd-scene' + (mode === 'fish' ? ' fish' : '')} id="sndScene">
          <div className={'snd-hud' + (audioOn ? ' live' : '')} id="sndHud">
            <span className="dot"></span>
            <span id="sndDb" ref={sndDbRef}>
              -- dB
            </span>
          </div>
          {mode === 'fish' && <div className="snd-hud2" id="fishHud2" ref={hud2Ref}></div>}
          <canvas
            className="fish-canvas"
            id="fishCanvas"
            ref={fishCanvasRef}
            style={{ display: mode === 'fish' ? 'block' : 'none' }}
          />
          <div id="ballArea" style={{ display: mode === 'ball' ? 'block' : 'none' }}>
            {ballContent}
          </div>
          <div className={'snd-status' + (mode === 'fish' ? ' fish' : '')} id="sndStatus" ref={statusRef}>
            点击「开始监测」启用麦克风
          </div>
        </div>
        <div className="snd-ctrls">
          <button className="btn pu" id="sndStart" onClick={startSound}>
            🎤 开始监测
          </button>
          <button className="btn ghost" id="sndStop" onClick={stopSound}>
            停止
          </button>
          <button className="btn ghost" id="sndFs" onClick={() => toggleFullscreen(sectionRef.current)}>
            ⛶ 全屏
          </button>
          <div className="ctl" id="ctlThreshold" style={{ display: mode === 'ball' ? 'flex' : 'none' }}>
            达标线{' '}
            <input
              type="range"
              id="sndThreshold"
              min={40}
              max={85}
              value={sound.threshold}
              onChange={(e) => {
                const v = +e.target.value
                setSound({ threshold: v })
                soundRef.current = { ...soundRef.current, threshold: v }
                if (goalRef.current) goalRef.current.textContent = String(v)
              }}
            />
            <span id="sndThresholdV">{sound.threshold}</span> dB
          </div>
          <div className="ctl">
            安静阈值{' '}
            <input
              type="range"
              id="sndQuiet"
              min={20}
              max={60}
              value={sound.quiet}
              onChange={(e) => {
                const v = +e.target.value
                setSound({ quiet: v })
                soundRef.current = { ...soundRef.current, quiet: v }
              }}
            />
            <span id="sndQuietV">{sound.quiet}</span> dB
          </div>
          <div className="ctl">
            灵敏度{' '}
            <input
              type="range"
              id="sndSens"
              min={30}
              max={150}
              value={sound.sens}
              onChange={(e) => {
                const v = +e.target.value
                setSound({ sens: v })
                soundRef.current = { ...soundRef.current, sens: v }
                if (sensRef.current) sensRef.current.textContent = String(v)
              }}
            />
            <span id="sndSensV">{sound.sens}</span>%
          </div>
        </div>
      </div>
    </section>
  )
}
