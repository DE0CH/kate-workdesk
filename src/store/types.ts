import type { Countdown } from '../lib/constants'

export interface Todo {
  id: string
  text: string
  date: string
  done: boolean
  doneAt: number | null
  createdAt: number
}

/** One scheduled course inside a weekday. `p` matches a Bell period name. */
export interface Course {
  p: string
  cls: string
  name: string
}

/** courses[weekday] where weekday is 1 (Mon) … 5 (Fri). */
export type Courses = Record<number, Course[]>

export interface Member {
  no: string
  name: string
}

export interface Group {
  key: string
  level: string
  leader: string
  task: string
  members: Member[]
}

/** groups[className] -> tiered groups. */
export type Groups = Record<string, Group[]>

export interface Settings {
  removedCD: string[]
  classNames: string[]
  scheduleNotes: string[]
  lockHash?: string
}

export interface SoundState {
  mode: 'ball' | 'fish'
  threshold: number
  quiet: number
  sens: number
}

export interface DrawState {
  used: number[]
  history: number[]
}

export interface PrepItem {
  id: string
  text: string
  type: string
  createdAt: number
}

/** lessonPrep[dateStr] -> items for that day. */
export type LessonPrep = Record<string, PrepItem[]>

export interface WorkbenchData {
  todos: Todo[]
  courses: Courses
  groups: Groups
  countdowns: Countdown[]
  settings: Settings
  sound: SoundState
  draw: DrawState
  lessonPrep: LessonPrep
}

export type DomainKey = keyof WorkbenchData
