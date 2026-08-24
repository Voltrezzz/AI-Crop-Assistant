-- CropSense stores profile records in public.cloud_records after Auth succeeds.
-- A stale handle_new_user trigger targeting a missing public.profiles table
-- rolls back inserts into auth.users with "Database error saving new user".
-- Remove only non-system auth.users triggers that invoke public.handle_new_user.

do $$
declare
  stale_trigger record;
begin
  for stale_trigger in
    select trigger_definition.tgname
    from pg_trigger as trigger_definition
    join pg_class as relation_definition
      on relation_definition.oid = trigger_definition.tgrelid
    join pg_namespace as relation_schema
      on relation_schema.oid = relation_definition.relnamespace
    join pg_proc as function_definition
      on function_definition.oid = trigger_definition.tgfoid
    join pg_namespace as function_schema
      on function_schema.oid = function_definition.pronamespace
    where relation_schema.nspname = 'auth'
      and relation_definition.relname = 'users'
      and function_schema.nspname = 'public'
      and function_definition.proname = 'handle_new_user'
      and not trigger_definition.tgisinternal
  loop
    execute format('drop trigger %I on auth.users', stale_trigger.tgname);
    raise notice 'Removed stale auth.users trigger: %', stale_trigger.tgname;
  end loop;
end
$$;

