create table if not exists public.cloud_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity text not null,
  local_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entity, local_id)
);

create index if not exists cloud_records_user_id_idx on public.cloud_records(user_id);
create index if not exists cloud_records_entity_idx on public.cloud_records(user_id, entity);

alter table public.cloud_records enable row level security;
revoke all on table public.cloud_records from anon, authenticated;
grant select, insert, update, delete on table public.cloud_records to authenticated;

create policy "Users can read their own cloud records"
on public.cloud_records for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own cloud records"
on public.cloud_records for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own cloud records"
on public.cloud_records for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own cloud records"
on public.cloud_records for delete to authenticated
using ((select auth.uid()) = user_id);

