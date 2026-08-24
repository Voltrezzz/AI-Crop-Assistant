import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const cleanEnvValue = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const quote = trimmed[0];
  return (quote === '"' || quote === "'") && trimmed.endsWith(quote)
    ? trimmed.slice(1, -1).trim()
    : trimmed;
};

const rawSupabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseKey = cleanEnvValue(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
);

const validateProjectUrl = (value?: string) => {
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('VITE_SUPABASE_URL is not a valid absolute URL.');
  }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) {
    throw new Error('VITE_SUPABASE_URL must be the HTTPS project URL ending in .supabase.co.');
  }
  if ((url.pathname && url.pathname !== '/') || url.search || url.hash) {
    throw new Error(`VITE_SUPABASE_URL must not contain an API path, query, or fragment (received path: ${url.pathname}).`);
  }
  return url.origin;
};

const supabaseUrl = validateProjectUrl(rawSupabaseUrl);

if (import.meta.env.DEV) {
  console.info('[Marudham 360] Supabase configuration', {
    urlConfigured: Boolean(supabaseUrl),
    projectDomain: supabaseUrl ? new URL(supabaseUrl).hostname : undefined,
    keyConfigured: Boolean(supabaseKey),
  });
}

let client: SupabaseClient | null = null;

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseKey);

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Cloud sync is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.');
  }
  client ??= createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
};
