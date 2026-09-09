import { CLASS_NAMES } from '../config'
import { GROUP_LEVELS } from '../lib/constants'
import type { Courses, Groups, Settings, SoundState, DrawState } from './types'

/** Blank weekly schedule — the teacher fills it in from the UI. */
export function defaultCourses(): Courses {
  return {}
}

/** No preset schedule notes. */
export function defaultScheduleNotes(): string[] {
  return []
}

/** 5 tiers × 10 seats, numbered 1–50, for every configured class. */
export function defaultGroups(): Groups {
  const g: Groups = {}
  CLASS_NAMES.forEach((c) => {
    g[c] = GROUP_LEVELS.map(([key, level], i) => {
      const members = []
      for (let j = 0; j < 10; j++) members.push({ no: String(i * 10 + j + 1), name: '' })
      return { key, level, leader: '', task: '', members }
    })
  })
  return g
}

export function defaultSettings(): Settings {
  return {
    removedCD: [],
    classNames: [...CLASS_NAMES],
    scheduleNotes: defaultScheduleNotes(),
  }
}

export function defaultSound(): SoundState {
  return { mode: 'ball', threshold: 60, quiet: 35, sens: 90 }
}

export function defaultDraw(): DrawState {
  return { used: [], history: [] }
}
