/** Variables públicas del frontend. Nunca contienen la service role (ver scripts/check-security.ts). */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
/** Sin Supabase configurado la app funciona en modo local (SPEC §11). */
export const ONLINE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
