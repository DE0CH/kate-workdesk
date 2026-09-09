import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '../lib/utils'
import { todayStr } from '../lib/date'
import type {
  WorkbenchData,
  Todo,
  Course,
  Group,
  Member,
  SoundState,
  PrepItem,
  Settings,
} from './types'
import {
  defaultCourses,
  defaultGroups,
  defaultSettings,
  defaultSound,
  defaultDraw,
  defaultScheduleNotes,
} from './defaults'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

interface Actions {
  // to-dos
  addTodo: (date: string, text: string) => boolean
  toggleTodo: (id: string) => boolean
  delTodo: (id: string) => void
  // schedule notes
  addNote: (text: string) => void
  editNote: (i: number, text: string) => void
  delNote: (i: number) => void
  // courses
  setCourse: (wd: number, p: string, cls: string, name: string) => void
  delCourse: (wd: number, p: string) => void
  // countdowns
  addCountdown: (name: string, date: string, cat: string) => void
  delCountdown: (id: string, builtin: boolean) => void
  // groups
  setGroupField: (cls: string, gi: number, field: 'leader' | 'task', value: string) => void
  setMember: (cls: string, gi: number, mi: number, no: string, name: string) => void
  importNames: (cls: string, rawText: string) => void
  resetGroups: (cls: string) => void
  rankRegroup: (cls: string, lines: string[]) => void
  // sound
  setSound: (patch: Partial<SoundState>) => void
  // draw
  applyDraw: (picks: number[]) => void
  resetDraw: () => void
  // lesson prep
  addPrep: (date: string, text: string, type: string) => void
  editPrep: (date: string, id: string, text: string, type: string) => void
  delPrep: (date: string, id: string) => void
  // lock
  setLockHash: (hash: string) => void
  // backup / reset
  importData: (data: Partial<WorkbenchData>) => void
  resetAll: () => void
}

export type Store = WorkbenchData & Actions

function initialData(): WorkbenchData {
  return {
    todos: [],
    courses: defaultCourses(),
    groups: defaultGroups(),
    countdowns: [],
    settings: defaultSettings(),
    sound: defaultSound(),
    draw: defaultDraw(),
    lessonPrep: {},
  }
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialData(),

      /* ---------------- to-dos ---------------- */
      addTodo: (date, text) => {
        const t = text.trim()
        if (!t) return false
        const todo: Todo = {
          id: uid(),
          text: t,
          date: date || todayStr(),
          done: false,
          doneAt: null,
          createdAt: Date.now(),
        }
        set({ todos: [todo, ...get().todos] })
        return true
      },
      toggleTodo: (id) => {
        let nowDone = false
        set({
          todos: get().todos.map((t) => {
            if (t.id !== id) return t
            nowDone = !t.done
            return { ...t, done: nowDone, doneAt: nowDone ? Date.now() : null }
          }),
        })
        return nowDone
      },
      delTodo: (id) => set({ todos: get().todos.filter((t) => t.id !== id) }),

      /* ---------------- schedule notes ---------------- */
      addNote: (text) => {
        const v = text.trim()
        if (!v) return
        const s = get().settings
        set({ settings: { ...s, scheduleNotes: [v, ...(s.scheduleNotes || [])] } })
      },
      editNote: (i, text) => {
        const s = get().settings
        const notes = (s.scheduleNotes || []).slice()
        if (i < 0 || i >= notes.length) return
        notes[i] = text
        set({ settings: { ...s, scheduleNotes: notes } })
      },
      delNote: (i) => {
        const s = get().settings
        const notes = (s.scheduleNotes || []).slice()
        notes.splice(i, 1)
        set({ settings: { ...s, scheduleNotes: notes } })
      },

      /* ---------------- courses ---------------- */
      setCourse: (wd, p, cls, name) => {
        const courses = clone(get().courses)
        const list = courses[wd] || (courses[wd] = [])
        const existing = list.find((c: Course) => c.p === p)
        if (existing) {
          existing.cls = cls
          existing.name = name
        } else {
          list.push({ p, cls, name })
        }
        set({ courses })
      },
      delCourse: (wd, p) => {
        const courses = clone(get().courses)
        courses[wd] = (courses[wd] || []).filter((c: Course) => c.p !== p)
        set({ courses })
      },

      /* ---------------- countdowns ---------------- */
      addCountdown: (name, date, cat) => {
        set({ countdowns: [...get().countdowns, { id: uid(), name, date, cat }] })
      },
      delCountdown: (id, builtin) => {
        if (builtin) {
          const s = get().settings
          set({ settings: { ...s, removedCD: [...(s.removedCD || []), id] } })
        } else {
          set({ countdowns: get().countdowns.filter((c) => c.id !== id) })
        }
      },

      /* ---------------- groups ---------------- */
      setGroupField: (cls, gi, field, value) => {
        const groups = clone(get().groups)
        if (groups[cls]?.[gi]) {
          groups[cls][gi][field] = value
          set({ groups })
        }
      },
      setMember: (cls, gi, mi, no, name) => {
        const groups = clone(get().groups)
        const m = groups[cls]?.[gi]?.members?.[mi]
        if (m) {
          m.no = no
          m.name = name
          set({ groups })
        }
      },
      importNames: (cls, rawText) => {
        const groups = clone(get().groups)
        const gs: Group[] = groups[cls] || (groups[cls] = defaultGroups()[cls])
        const all: Member[] = []
        gs.forEach((g) => (g.members.forEach((m) => all.push(m))))
        let idx = 0
        rawText.split(/\n/).forEach((raw) => {
          const line = raw.trim()
          if (!line) return
          const parts = line.split(/[\s,，\t]+/).filter(Boolean)
          let no: string, name: string
          if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
            no = parts[0]
            name = parts.slice(1).join(' ')
          } else {
            idx++
            no = String(idx)
            name = line
          }
          const target = all.find((m) => m.no === no) || all[idx - 1]
          if (target) {
            target.no = no
            target.name = name
          }
        })
        set({ groups })
      },
      resetGroups: (cls) => {
        const groups = clone(get().groups)
        groups[cls] = defaultGroups()[cls]
        set({ groups })
      },
      rankRegroup: (cls, lines) => {
        const groups = clone(get().groups)
        const gs: Group[] = groups[cls]
        const flat: Member[] = []
        gs.forEach((g) => g.members.forEach((m) => flat.push(m)))
        const used: Record<string, 1> = {}
        flat.forEach((m) => (used[m.no] = 1))
        const picked = new Set<Member>()
        const ranked: Member[] = []
        lines.forEach((v) => {
          let target = flat.find((m) => (m.name === v || m.no === v) && !picked.has(m))
          if (target) {
            picked.add(target)
            ranked.push(target)
          } else if (/^\d+$/.test(v) && used[v]) {
            target = flat.find((m) => m.no === v && !picked.has(m))
            if (target) {
              picked.add(target)
              ranked.push(target)
            }
          }
        })
        flat.forEach((m) => {
          if (!picked.has(m)) ranked.push(m)
        })
        ranked.forEach((m, i) => {
          const g = Math.min(4, Math.floor(i / 10))
          const slot = gs[g].members[i % 10]
          if (slot) {
            slot.no = m.no
            slot.name = m.name
          }
        })
        set({ groups })
      },

      /* ---------------- sound ---------------- */
      setSound: (patch) => set({ sound: { ...get().sound, ...patch } }),

      /* ---------------- draw ---------------- */
      applyDraw: (picks) => {
        const draw = clone(get().draw)
        picks.forEach((p) => {
          draw.used.push(p)
          draw.history.unshift(p)
        })
        if (draw.history.length > 30) draw.history = draw.history.slice(0, 30)
        set({ draw })
      },
      resetDraw: () => set({ draw: { used: [], history: [] } }),

      /* ---------------- lesson prep ---------------- */
      addPrep: (date, text, type) => {
        const lessonPrep = clone(get().lessonPrep)
        const d = date || todayStr()
        if (!lessonPrep[d]) lessonPrep[d] = []
        lessonPrep[d].push({ id: uid(), text, type, createdAt: Date.now() })
        set({ lessonPrep })
      },
      editPrep: (date, id, text, type) => {
        const lessonPrep = clone(get().lessonPrep)
        const it = (lessonPrep[date] || []).find((x: PrepItem) => x.id === id)
        if (it) {
          it.text = text
          it.type = type
          set({ lessonPrep })
        }
      },
      delPrep: (date, id) => {
        const lessonPrep = clone(get().lessonPrep)
        if (!lessonPrep[date]) return
        lessonPrep[date] = lessonPrep[date].filter((x: PrepItem) => x.id !== id)
        if (!lessonPrep[date].length) delete lessonPrep[date]
        set({ lessonPrep })
      },

      /* ---------------- lock ---------------- */
      setLockHash: (hash) => set({ settings: { ...get().settings, lockHash: hash } }),

      /* ---------------- backup / reset ---------------- */
      importData: (data) => {
        const keepLock = get().settings.lockHash
        const patch: Partial<WorkbenchData> = {}
        ;(
          ['todos', 'courses', 'groups', 'countdowns', 'settings', 'sound', 'draw', 'lessonPrep'] as const
        ).forEach((k) => {
          if (data[k] != null) (patch as Record<string, unknown>)[k] = data[k]
        })
        if (patch.settings) {
          const s = patch.settings as Settings
          if (keepLock && !s.lockHash) s.lockHash = keepLock
        }
        set(patch)
      },
      resetAll: () => {
        const keepLock = get().settings.lockHash
        const fresh = initialData()
        if (keepLock) fresh.settings.lockHash = keepLock
        set(fresh)
      },
    }),
    {
      name: 'teacher_workbench',
      version: 1,
      partialize: (s) => ({
        todos: s.todos,
        courses: s.courses,
        groups: s.groups,
        countdowns: s.countdowns,
        settings: s.settings,
        sound: s.sound,
        draw: s.draw,
        lessonPrep: s.lessonPrep,
      }),
      merge: (persisted, current) => {
        // Guard against a partially-populated persisted blob (e.g. a
        // settings object missing new keys) so defaults always exist.
        const p = (persisted || {}) as Partial<WorkbenchData>
        return {
          ...current,
          ...p,
          settings: { ...defaultSettings(), ...(p.settings || {}) },
          sound: { ...defaultSound(), ...(p.sound || {}) },
          draw: { ...defaultDraw(), ...(p.draw || {}) },
        } as Store
      },
    },
  ),
)

// Ensure scheduleNotes is always an array (older blobs may lack it).
{
  const s = useStore.getState().settings
  if (!Array.isArray(s.scheduleNotes)) {
    useStore.setState({ settings: { ...s, scheduleNotes: defaultScheduleNotes() } })
  }
}
