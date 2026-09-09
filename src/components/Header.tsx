import { CONFIG } from '../config'
import { QUOTES, WEEKDAY_CN } from '../lib/constants'
import CatLogo from './CatLogo'
import { SyncBadge } from '../sync/SyncUI'

export default function Header() {
  const now = new Date()
  const wd = WEEKDAY_CN[now.getDay()]
  const h = now.getHours()
  const greet = h < 6 ? '夜深了' : h < 12 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
  const who = CONFIG.teacherName ? ' ' + CONFIG.teacherName : ' 老师'
  const dateLine = `${greet}${who} · ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${wd}`

  const start = new Date(now.getFullYear(), 0, 0)
  const idx = Math.floor((now.getTime() - start.getTime()) / 864e5) % QUOTES.length
  const [en, zh] = QUOTES[idx]

  return (
    <header className="top">
      <div className="brand">
        <div className="logo">
          <CatLogo />
        </div>
        <div>
          <h1>{CONFIG.appName}</h1>
          <p>{CONFIG.tagline}</p>
        </div>
      </div>
      <div className="head-right">
        <div className="date-line">{dateLine}</div>
        <div className="quote">
          “{en}” {zh}
        </div>
        <SyncBadge />
      </div>
    </header>
  )
}
