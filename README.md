# 教师工作台 · Teacher Workbench

A single-page teaching workbench for a classroom teacher — schedule, to-dos,
lesson-prep calendar, random picker, class timer, student tiering, and
sound-interaction games. Built as a fast, offline-capable web app that runs
great on an iPad in class.

Originally a hand-written single HTML file; this repo is the cleaned-up
**React + TypeScript + Tailwind (Vite)** rewrite. Same features, same look,
maintainable code, and no personal data baked in.

## Features (7 tabs)

1. **课程表 Schedule** — weekly grid (Mon–Fri × 12 periods). Tap a slot to add/edit a class; free-text notes for schedule tweaks.
2. **待办提醒 To-dos** — today (with overdue), upcoming, and done lists; date picker, quick tags, and 🎤 voice input.
3. **备课日历 Lesson-prep calendar** — month view with per-day prep/meeting items, plus "this week's prep" and "this week's key items" side panels.
4. **课堂抽签 Random picker** — fair 1–50 draw with a no-repeat mode, multi-draw, and a rolling animation.
5. **课堂计时器 Class timer** — big projected countdown with presets, a bell, and fullscreen.
6. **学生分层 Student tiering** — 5 tiers × 10 seats per class; roster import and rank-based regrouping.
7. **声音互动 Sound interaction** — mic-driven "sound-wave ball" (read-aloud) and "keep-the-fish-calm" (quiet-time) games. Audio is analyzed **locally only, never uploaded**.

A pinned **countdown strip** sits above the tabs (built-in holidays + custom).
A lightweight client-side **PIN lock** keeps students from tapping around
during class (not a security control).

## Tech

- **Vite + React 18 + TypeScript** (strict)
- **Tailwind CSS** with the design tokens as CSS variables, plus a ported component-style layer
- **Zustand** store with `localStorage` persistence (per the `teacher_workbench` key)
- Zero third-party runtime data calls in the base build — everything works offline

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

## Configuration

All deployment-/teacher-specific defaults live in **`src/config.ts`**:

- `appName`, `tagline`, `teacherName` (greeting; blank → generic "老师")
- `classes` — the class list and their colour roles
- `defaultLockPassword` — the initial PIN (default `0000`; changeable in-app under 🔒 门锁设置)

Everything else (real timetable, student names, notes) is entered by the
teacher inside the app and stored in their own browser.

## Cloud sync (optional)

The app is fully functional offline with `localStorage`. Cross-device sync via
**Supabase** (email magic-link + row-level security) can be enabled by setting
two environment variables — see `.env.example`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

When unset, the app stays in local-only mode. **Never commit real keys** —
configure them as environment variables in your host (e.g. Vercel).

## Deployment

Live (China-reachable, no ICP 备案): **https://kate.deyaochen.com**
(Aliyun OSS Hong Kong + custom domain + HTTPS).

Everything ships from this repo via GitHub Actions — **edit source, push to
`main`, it deploys**:

- **Frontend** (`.github/workflows/frontend.yml`): build + upload `dist/` to the OSS bucket.
- **Database** (`.github/workflows/database.yml`): apply `supabase/migrations/**` via `supabase db push`.

Full architecture, the one-time infra, the required GitHub secrets, and the
**limitations** are documented in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

The build is a plain static SPA, so it can also be served from any static host
(`npm run build` → `dist/`).
