/* ============================================================
   App configuration & personalization.

   This is the ONLY place that carries user-/deployment-specific
   defaults. The app ships with generic placeholders so it can live
   in a public repo; a real deployment customizes the values here (or
   the teacher edits classes / schedule / password from inside the UI,
   which is then stored in their own browser).
   ============================================================ */

export interface ClassConfig {
  /** Stable key used in stored data. */
  name: string
  /** Colour role for the schedule grid chip: 'a' (lilac) or 'b' (rose). */
  variant: 'a' | 'b'
}

export const CONFIG = {
  /** Product name — shown in the header, lock screen and browser tab. */
  appName: '教师工作台',

  /** Short tagline under the app name. */
  tagline: '把课堂安排好，把每一天过从容',

  /**
   * Teacher's display name for greetings. Empty by default (generic
   * "老师"). A deployment may set e.g. "王老师".
   */
  teacherName: '',

  /**
   * Default door-lock password. Purely to stop students tapping around
   * during class — it is NOT a security control (client-side only).
   * The teacher can change it from "🔒 门锁设置" inside the app.
   */
  defaultLockPassword: '0000',

  /** Default classes. Two is the common case; add more if needed. */
  classes: [
    { name: '1班', variant: 'a' },
    { name: '2班', variant: 'b' },
  ] as ClassConfig[],
}

export const CLASS_NAMES: string[] = CONFIG.classes.map((c) => c.name)

/** name -> 'a' | 'b' colour role for the schedule grid. */
export const CLASS_VARIANT: Record<string, 'a' | 'b'> = Object.fromEntries(
  CONFIG.classes.map((c) => [c.name, c.variant]),
)
