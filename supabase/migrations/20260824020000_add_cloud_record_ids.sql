-- Stable record identity for multi-device synchronization.
alter table public.cloud_records
  add column if not exists cloud_id uuid;

update public.cloud_records
set cloud_id = gen_random_uuid()
where cloud_id is null;

alter table public.cloud_records
  alter column cloud_id set not null;

alter table public.cloud_records
  drop constraint if exists cloud_records_user_id_entity_local_id_key;

create unique index if not exists cloud_records_user_entity_cloud_id_idx
  on public.cloud_records(user_id, entity, cloud_id);

create index if not exists cloud_records_cloud_id_idx
  on public.cloud_records(cloud_id);
