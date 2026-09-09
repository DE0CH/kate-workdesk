-- ============================================================
-- workbench table — per-user cloud sync (email magic-link auth)
--
-- All database changes are made by editing SQL in supabase/migrations/
-- and are applied to the project by CI (see .github/workflows/database.yml).
-- Keep migrations idempotent where practical.
--
-- Security model (Supabase standard pattern):
--   1. RLS on; policy forces auth.uid() = user_id
--      → with no valid user JWT not a single row is returned; the public
--        anon key is therefore safe to ship in the client.
--   2. LWW trigger: on UPDATE, reject an older updated_at (server-side guard).
--   3. CHECK bounds the payload size.
--   4. user_id references auth.users, cascading on account delete.
-- ============================================================

create table if not exists workbench (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb,
  updated_at  bigint not null default 0,
  constraint payload_size check (length(data::text) < 524288)
);

alter table workbench enable row level security;

drop policy if exists "own row" on workbench;
create policy "own row" on workbench
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function workbench_lww() returns trigger as $$
begin
  if tg_op = 'UPDATE' and new.updated_at <= old.updated_at then
    return old;  -- cancel this update, keep the existing row
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists workbench_lww on workbench;
create trigger workbench_lww
  before update on workbench
  for each row execute function workbench_lww();
