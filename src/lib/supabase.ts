import type { SupabaseClient } from '@supabase/supabase-js';
import { ONLINE, SUPABASE_ANON_KEY, SUPABASE_URL } from './env.ts';

let clientPromise: Promise<SupabaseClient> | null = null;

/** Cliente con la anon key (pública). El SDK se carga de forma diferida solo en modo online. */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!ONLINE) return null;
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    }),
  );
  return clientPromise;
}

export async function accessToken(): Promise<string | null> {
  const p = getSupabase();
  if (!p) return null;
  const sb = await p;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}
