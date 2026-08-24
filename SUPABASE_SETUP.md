# Supabase cloud setup

Marudham 360 remains local-first with IndexedDB. When Supabase is configured, authenticated users also synchronize profiles, fields, scan metadata, and chatbot history to the cloud. Scan images remain local and are not stored as base64 database rows.

## 1. Create the database

Create a Supabase project, open its SQL editor, and run `supabase/migrations/20260824000000_create_cloud_records.sql`.

If Auth signup reports `Database error saving new user`, also run `supabase/migrations/20260824010000_remove_stale_profile_trigger.sql`. It removes only obsolete `auth.users` triggers that call `public.handle_new_user`; Marudham 360 creates its cloud profile record after Auth returns a valid session.

The migration enables Row Level Security and permits authenticated users to access only records whose `user_id` matches their Supabase identity.

## 2. Configure the app

Copy `.env.example` to `.env` and set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_or_anon_key
```

The publishable/anon key is intended for browser use. Never put a Supabase service-role key in this project.

## 3. Configure authentication

Enable email/password authentication in Supabase. If email confirmation is enabled, new users must confirm their email before signing in and synchronizing.

Restart the Vite development server after changing `.env`.

## Behavior

- Without Supabase variables, the existing offline/demo behavior continues unchanged.
- With Supabase configured, normal registration and login use Supabase Auth.
- Local writes enter the Dexie sync queue and upload when authenticated and online.
- Successful login downloads the user's cloud profiles, fields, scan metadata, and chat messages into the local cache.
- Demo accounts remain local-only.
