import { useState } from 'react'
import { ToastProvider } from './ui/toast'
import Header from './components/Header'
import CountdownStrip from './components/CountdownStrip'
import Tabs, { type TabKey } from './components/Tabs'
import Footer from './components/Footer'
import LockScreen, { LOCK_DEF_HASH } from './components/LockScreen'
import { useStore } from './store/store'
import ScheduleView from './views/ScheduleView'
import TodosView from './views/TodosView'
import PrepView from './views/PrepView'
import DrawView from './views/DrawView'
import TimerView from './views/TimerView'
import GroupsView from './views/GroupsView'
import SoundView from './views/SoundView'

function initialLocked(): boolean {
  try {
    const saved = localStorage.getItem('wbLockOk')
    const ts = +(localStorage.getItem('wbLockTs') || 0)
    const cur = useStore.getState().settings.lockHash || LOCK_DEF_HASH
    if (saved === cur && (!ts || Date.now() - ts < 7 * 86400000)) return false
  } catch {
    /* ignore */
  }
  return true
}

function AppInner() {
  const [tab, setTab] = useState<TabKey>('schedule')
  const [locked, setLocked] = useState(initialLocked)

  return (
    <>
      <LockScreen locked={locked} onUnlock={() => setLocked(false)} />
      <div className="wrap">
        <Header />
        <CountdownStrip />
        <Tabs active={tab} onChange={setTab} />
        <ScheduleView active={tab === 'schedule'} />
        <TodosView active={tab === 'todos'} />
        <PrepView active={tab === 'prep'} />
        <DrawView active={tab === 'draw'} />
        <TimerView active={tab === 'cd'} />
        <GroupsView active={tab === 'grp'} />
        <SoundView active={tab === 'snd'} />
        <Footer />
      </div>
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}
