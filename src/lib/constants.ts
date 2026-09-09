/* Static, non-personal content: bell schedule, holidays, motivational
   copy, countdown categories. Safe to ship publicly. */

export interface Bell {
  p: string
  t: string
  /** 'read' = reading period, 'ex' = break/extended — rendered dim & short. */
  k?: 'read' | 'ex'
}

export const BELLS: Bell[] = [
  { p: '早读', t: '7:35-7:55', k: 'read' },
  { p: '第1节', t: '8:00-8:40' },
  { p: '第2节', t: '8:50-9:30' },
  { p: '第3节', t: '9:40-10:20' },
  { p: '第4节', t: '10:35-11:15' },
  { p: '第5节', t: '11:25-12:05' },
  { p: '午读', t: '13:35-13:55', k: 'read' },
  { p: '第6节', t: '14:00-14:40' },
  { p: '第7节', t: '14:55-15:35' },
  { p: '第8节', t: '15:45-16:25' },
  { p: '大课间', t: '16:25-16:55', k: 'ex' },
  { p: '延时服务', t: '16:55-17:55', k: 'ex' },
]

export interface HolidayRange {
  s: string
  e: string
  n: string
}

/** Generic mainland-China public holidays (academic year 2026 秋 – 2027 春). */
export const HOL_RANGES: HolidayRange[] = [
  { s: '2026-09-25', e: '2026-09-27', n: '中秋' },
  { s: '2026-10-01', e: '2026-10-07', n: '国庆' },
  { s: '2027-01-01', e: '2027-01-03', n: '元旦' },
  { s: '2027-02-06', e: '2027-02-12', n: '春节' },
]

export interface Countdown {
  id: string
  name: string
  date: string
  cat: string
  note?: string
  built?: boolean
}

export const BUILTIN_CD: Countdown[] = [
  { id: 'b1', name: '中秋节', date: '2026-09-25', cat: '假期' },
  { id: 'b2', name: '国庆节', date: '2026-10-01', cat: '假期' },
  { id: 'b3', name: '元旦', date: '2027-01-01', cat: '假期' },
  { id: 'b4', name: '春节', date: '2027-02-06', cat: '假期', note: '正月初一,具体安排以官方通知为准' },
]

export const CD_CAT_COLORS: Record<string, string> = {
  假期: '#dfa9a4',
  考试: '#c68282',
  活动: '#92abc7',
  其它: '#989bc6',
}

export const CD_CATS = ['假期', '考试', '活动', '其它']

export const QUOTES: [string, string][] = [
  ['Today’s plan beats tomorrow’s wish.', '今日的计划,胜过明日的愿望。'],
  ['The best way to predict the future is to create it.', '预测未来最好的方式,就是亲手创造它。'],
  ['Don’t watch the clock; do what it does. Keep going.', '别盯着时钟,学它那样,一直走下去。'],
  ['Small steps every day add up to big changes.', '每天一小步,累积成大改变。'],
  ['Done is better than perfect.', '完成,胜过完美。'],
  ['Fall seven times, stand up eight.', '跌到七次,第八次也要站起来。'],
  ['You are the magic in their classroom.', '你就是这间教室里的魔法。'],
  ['Make today so awesome, yesterday gets jealous.', '把今天过得够精彩,让昨天都嫉妒。'],
]

export const HIT_TEXTS = [
  '就是你啦!躲不掉的缘分 🎯',
  '命运的指针,选中了你 ✨',
  '恭喜中奖,请开始你的表演 🎤',
  '全班的目光,聚焦在你身上 👀',
  '天选之人,非你莫属 🏆',
  '这个学号,今天必须拥有姓名 ⭐',
]

export const DONE_TEXTS = [
  '搞定!去喝口水奖励自己 💧',
  '这一条消灭了,下一条还敢来吗?',
  '划掉的感觉真爽,对吧?',
  '优秀!今天的你值得加鸡腿 🍗',
  '好耶,清单又短了一截 ✂️',
  '漂亮!待办界又少了一位悍将 🦸',
]

/** Lesson-prep item types. */
export const PREP_TYPES = ['备课', '听写', '默写', '测试', '复习', '讲', '会议', '其他']

/** Quick tags for the to-do input. */
export const TODO_QUICK_TAGS = ['批改作业', '听写', '默写', '单元测试', '家长沟通', '备课']

/** Group tier levels: key, level name. */
export const GROUP_LEVELS: [string, string][] = [
  ['A', '拓展拔高'],
  ['B', '巩固提升'],
  ['C', '稳扎稳打'],
  ['D', '基础夯实'],
  ['E', '起步冲刺'],
]

export const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六']
