import { useCallback, useEffect, useState } from 'react';
import { mergeAnonymous } from '../lib/api.ts';
import { ONLINE } from '../lib/env.ts';
import { getSupabase } from '../lib/supabase.ts';

/**
 * Sesión (SPEC §7): anónima inmediata, alias público y vinculación por magic link.
 * - Email nuevo: updateUser({ email }) → mismo user_id, sin fusión.
 * - Email existente: signInWithOtp + POST /api/account/merge con el token anónimo guardado.
 */
export interface AccountState {
  status: 'local' | 'loading' | 'ready' | 'error';
  userId: string | null;
  isAnonymous: boolean;
  alias: string;
  email: string | null;
  message: string | null;
}

const PENDING_MERGE = 'matriculas.pendingMerge';

export function useAccount() {
  const [state, setState] = useState<AccountState>({
    status: ONLINE ? 'loading' : 'local',
    userId: null,
    isAnonymous: true,
    alias: '',
    email: null,
    message: null,
  });

  const refresh = useCallback(async () => {
    const p = getSupabase();
    if (!p) return;
    const sb = await p;
    let { data } = await sb.auth.getSession();
    if (!data.session) {
      const res = await sb.auth.signInAnonymously();
      if (res.error) {
        setState((s) => ({ ...s, status: 'error', message: 'No se pudo iniciar sesión anónima. ¿Está activado en Supabase?' }));
        return;
      }
      data = (await sb.auth.getSession()).data;
    }
    const user = data.session?.user;
    if (!user) return;
    const { data: profile } = await sb.from('profiles').select('alias').eq('id', user.id).maybeSingle();
    setState((s) => ({
      ...s,
      status: 'ready',
      userId: user.id,
      isAnonymous: Boolean(user.is_anonymous),
      email: user.email ?? null,
      alias: (profile?.alias as string | undefined) ?? '',
    }));
  }, []);

  useEffect(() => {
    const p = getSupabase();
    if (!p) return;
    let unsub: (() => void) | undefined;
    void p.then((sb) => {
      void refresh();
      const { data } = sb.auth.onAuthStateChange((event: string, session: { access_token: string; user: { id: string; is_anonymous?: boolean } } | null) => {
        if (event === 'SIGNED_IN' && session && !session.user.is_anonymous) {
          const raw = localStorage.getItem(PENDING_MERGE);
          if (raw) {
            const pending = JSON.parse(raw) as { anonId: string; token: string };
            localStorage.removeItem(PENDING_MERGE);
            if (pending.anonId !== session.user.id) {
              void mergeAnonymous(session.access_token, pending.token)
                .then(() => setState((s) => ({ ...s, message: 'Tus partidas anónimas se han fusionado con tu cuenta.' })))
                .catch(() => setState((s) => ({ ...s, message: 'No se pudieron fusionar las partidas anónimas (la sesión anónima caducó).' })));
            }
          }
        }
        void refresh();
      });
      unsub = () => data.subscription.unsubscribe();
    });
    return () => unsub?.();
  }, [refresh]);

  const updateAlias = useCallback(async (alias: string) => {
    const p = getSupabase();
    if (!p || !state.userId) return { ok: false, error: 'Sin sesión' };
    const clean = alias.trim();
    if (!/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _-]{3,20}$/.test(clean)) return { ok: false, error: 'De 3 a 20 letras, números, espacios, - o _.' };
    const sb = await p;
    const { error } = await sb.from('profiles').update({ alias: clean }).eq('id', state.userId);
    if (error) return { ok: false, error: error.code === '23505' ? 'Ese alias ya está cogido.' : 'No se pudo guardar el alias.' };
    setState((s) => ({ ...s, alias: clean }));
    return { ok: true as const };
  }, [state.userId]);

  const linkEmail = useCallback(async (email: string) => {
    const p = getSupabase();
    if (!p) return 'Modo local: configura Supabase para usar cuentas.';
    const sb = await p;
    const redirect = window.location.origin;
    const { data } = await sb.auth.getSession();
    const session = data.session;
    if (session?.user.is_anonymous) {
      const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: redirect });
      if (!error) return 'Te hemos enviado un enlace. Al abrirlo, esta misma cuenta quedará vinculada a tu email.';
      const exists = error.code === 'email_exists' || /already/i.test(error.message ?? '');
      if (!exists) return 'No se pudo enviar el enlace. Revisa el email.';
      localStorage.setItem(PENDING_MERGE, JSON.stringify({ anonId: session.user.id, token: session.access_token }));
    }
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirect } });
    return error ? 'No se pudo enviar el enlace.' : 'Ese email ya tiene cuenta: abre el enlace y fusionaremos tus partidas de este dispositivo.';
  }, []);

  const signOut = useCallback(async () => {
    const p = getSupabase();
    if (!p) return;
    const sb = await p;
    await sb.auth.signOut();
    await refresh();
  }, [refresh]);

  return { account: state, updateAlias, linkEmail, signOut };
}
