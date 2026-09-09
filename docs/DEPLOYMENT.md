# Deployment & CI/CD

Everything ships from this repo. **Edit source → push to `main` → GitHub
Actions deploys.** Two independent pipelines:

| Change you make | Workflow | What it does |
|---|---|---|
| App code (`src/**`, `index.html`, config) | `.github/workflows/frontend.yml` | `npm ci && npm run build`, then upload `dist/` to Aliyun OSS (Hong Kong) |
| DB schema (`supabase/migrations/**`) | `.github/workflows/database.yml` | `supabase db push` — applies new migrations to the Supabase project |

Live site (China-reachable, no 备案): **https://kate.deyaochen.com**

---

## Architecture

```
 Browser (kate.deyaochen.com, Hong Kong OSS, HTTPS)
   │  static SPA (React build) — no server
   │  calls Supabase directly with the public anon key
   ▼
 Supabase (Singapore): Auth (email magic-link) + PostgREST + Postgres
   RLS scopes every row to auth.uid() = user_id
```

- **Frontend** is pure static files. "Deploy" = upload files to an object-
  storage bucket. GitHub Actions does exactly that.
- **Database** changes are SQL migration files in `supabase/migrations/`,
  applied by the Supabase CLI in CI. Nothing is clicked in a dashboard.

### Why Hong Kong OSS + a custom domain
- `*.vercel.app` and most western hosts are blocked/poisoned by the GFW.
- A **Hong Kong** object-storage bucket needs no ICP 备案 and is ~10 ms from
  Shenzhen.
- Aliyun **force-downloads HTML on the default OSS domain** (anti-website
  policy: `Content-Disposition: attachment`). So the bucket is served through
  a **custom domain** (`kate.deyaochen.com`) bound to the bucket with an HTTPS
  cert — on a bound custom domain OSS serves HTML inline. HTTPS is required
  for the microphone (sound tab) and is just good practice.

---

## One-time infrastructure (already set up)

You should not need to redo these; they're recorded here for recovery.

1. **Supabase project** `nsqcbacxwwkkyzoghbae` (region `ap-southeast-1`),
   `workbench` table + RLS + LWW trigger, Auth site-url/redirect allow-list =
   the site URL.
2. **OSS bucket** `kate-workdesk-hk` (region `oss-cn-hongkong`), public-read,
   bucket-level "Block Public Access" turned **off**, static website hosting
   on (`index.html`).
3. **Custom domain** `kate.deyaochen.com`:
   - Cloudflare DNS (zone `deyaochen.com`): `CNAME kate → kate-workdesk-hk.oss-cn-hongkong.aliyuncs.com` (**DNS-only / grey-cloud**, not proxied) + a `_dnsauth.kate` TXT used once for OSS ownership verification.
   - HTTPS cert (Let's Encrypt, via Cloudflare DNS-01) bound to the bucket cname.
   - The cert auto-expires in ~90 days — **it must be renewed** (see Limitations).

---

## GitHub secrets & variables to configure

Add these in the repo → Settings → Secrets and variables → Actions.

### Repository **variables** (not secret)
| Name | Value |
|---|---|
| `SUPABASE_PROJECT_REF` | `nsqcbacxwwkkyzoghbae` |

### Repository **secrets**
| Name | What it is / where to get it |
|---|---|
| `VITE_SUPABASE_URL` | `https://nsqcbacxwwkkyzoghbae.supabase.co` (public) |
| `VITE_SUPABASE_ANON_KEY` | Project → Settings → API → anon/publishable key (public, RLS-safe) |
| `ALIYUN_AK_ID` | A RAM user AccessKey ID with **`AliyunOSSFullAccess`** only (don't use the root key) |
| `ALIYUN_AK_SECRET` | that RAM user's AccessKey Secret |
| `SUPABASE_ACCESS_TOKEN` | A Supabase **personal access token** (Account → Access Tokens) — dedicated to CI |
| `SUPABASE_DB_PASSWORD` | The project's database password (Project → Settings → Database; reset it there if unknown) |

The two `VITE_*` values are compiled into the client bundle and are public by
design. The rest are real secrets — scope them (RAM OSS-only user, a dedicated
Supabase token) and rotate if leaked.

---

## Making changes

**Frontend:** edit `src/**`, commit, push. CI builds and uploads. Hashed asset
files are cached forever; `index.html` is `no-cache`, so a new deploy is live
on the next page load.

**Database:** create a new migration and push:
```bash
# locally, if you have the Supabase CLI:
supabase migration new add_something
# …edit the generated supabase/migrations/<ts>_add_something.sql…
git add supabase/migrations && git commit -m "db: add something" && git push
```
You can also just hand-write a new timestamped `.sql` file in
`supabase/migrations/`. CI runs `supabase db push`, which applies only
migrations not yet recorded in the project's `schema_migrations` table.

---

## Limitations (read before relying on this)

### Frontend
- **Build-time config.** `VITE_SUPABASE_URL/ANON_KEY` are baked in at build.
  Changing them requires editing the secrets and re-running the workflow, not
  just a DB change.
- **No atomic deploy / instant rollback.** Upload is file-by-file. Because
  asset filenames are content-hashed, a half-finished upload won't serve a
  broken mix, but there's no one-click "roll back to the previous version" —
  you redeploy an older commit.
- **Cert renewal is not automated in CI.** The Let's Encrypt cert on
  `kate.deyaochen.com` lasts ~90 days. It must be re-issued and re-bound to the
  OSS bucket cname before expiry (a small scheduled job or a manual re-run).
  If it lapses, the site shows a TLS error.
- **Cross-border reliability.** HK is excellent from South China (Shenzhen),
  but far-north-China users can see occasional cross-border wobble at peak
  hours. For nationwide, fastest, fully-stable hosting you'd do ICP 备案 +
  mainland OSS/CDN (see the 备案 notes) — the app code and this pipeline don't
  change, only the bucket/domain.

### Database
- **Forward-only migrations.** `supabase db push` applies pending migrations;
  it does not auto-roll-back. Undoing a change means writing a new migration.
- **Destructive changes lose data.** `drop column` / `drop table` in a
  migration runs against the live DB. Review carefully; there is no staging DB
  in this setup.
- **Schema only, not all project settings.** Migrations cover tables, RLS,
  functions, triggers, extensions. They do **not** cover Auth settings (email
  provider, SMTP, redirect URLs, rate limits), storage buckets config, or API
  settings — those are project configuration, changed via the dashboard or the
  Management API, and are *not* in source control here.
- **User data isn't schema.** Auth users live in `auth.users` (managed by
  GoTrue, created on login), and per-user rows in `workbench` are written by
  the app at runtime — neither is seeded by migrations. One-off seeding (e.g.
  a teacher's initial setup) is done out-of-band with the service-role key, not
  through this pipeline.
- **CI needs DB reachability.** `db push` connects to Postgres via the Supabase
  pooler using `SUPABASE_DB_PASSWORD`. If a run fails to connect, check the
  password secret and that the project is healthy.
- **No PR preview / dry-run.** Migrations apply on push to `main`. There's no
  separate preview database; test risky migrations locally with
  `supabase start` first.
