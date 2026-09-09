// Apply supabase/migrations/*.sql to the project via the Supabase Management
// API (POST /v1/projects/{ref}/database/query). Tracks applied files in
// ci.applied_migrations so each runs at most once. Needs only:
//   SUPABASE_ACCESS_TOKEN  — a Supabase personal access token
//   SUPABASE_PROJECT_REF   — the project ref
// (No database password / direct connection required.)
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const REF = process.env.SUPABASE_PROJECT_REF
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!REF || !TOKEN) {
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

const API = `https://api.supabase.com/v1/projects/${REF}/database/query`

async function query(sql) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`query failed ${r.status}: ${text.slice(0, 400)}`)
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations')
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

// ledger of applied migrations
await query(`create schema if not exists ci;
create table if not exists ci.applied_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);`)

const appliedRows = await query(`select version from ci.applied_migrations;`)
const applied = new Set(
  (Array.isArray(appliedRows) ? appliedRows : []).map((r) => r.version),
)

let ran = 0
for (const file of files) {
  if (applied.has(file)) {
    console.log(`· skip   ${file} (already applied)`)
    continue
  }
  const sql = readFileSync(join(migrationsDir, file), 'utf8')
  console.log(`→ apply  ${file}`)
  // atomic per migration; record the version in the same transaction
  const wrapped = `begin;\n${sql}\ninsert into ci.applied_migrations(version) values ('${file}');\ncommit;`
  await query(wrapped)
  ran++
}

console.log(ran ? `Applied ${ran} migration(s).` : 'No new migrations.')
