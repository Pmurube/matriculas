import { useState, type FormEvent } from 'react';
import type { AccountState } from '../hooks/useAccount.ts';
import { Modal } from './Modal.tsx';

interface Props {
  onClose: () => void;
  account: AccountState;
  updateAlias: (a: string) => Promise<{ ok: boolean; error?: string }>;
  linkEmail: (e: string) => Promise<string>;
  signOut: () => Promise<void>;
}

export function AccountModal({ onClose, account, updateAlias, linkEmail, signOut }: Props) {
  const [alias, setAlias] = useState(account.alias);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(account.message);
  if (account.status === 'local') {
    return (
      <Modal title="Mi cuenta" onClose={onClose}>
        <p className="rounded-xl bg-asphalt p-4 text-sm">Modo local: tus estadísticas e insignias se guardan en este dispositivo. Para cuentas, alias público y ranking hay que configurar Supabase (ver README).</p>
      </Modal>
    );
  }
  const saveAlias = async (e: FormEvent) => {
    e.preventDefault();
    const r = await updateAlias(alias);
    setMsg(r.ok ? 'Alias guardado.' : (r.error ?? 'Error'));
  };
  const sendLink = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(await linkEmail(email.trim()));
  };
  return (
    <Modal title="Mi cuenta" onClose={onClose}>
      <div className="space-y-6 text-sm">
        <p className="rounded-xl bg-asphalt p-3">
          {account.status === 'loading' ? 'Conectando…' : account.isAnonymous ? 'Juegas como invitado en este dispositivo. Vincula un email para no perder tus récords.' : `Cuenta vinculada${account.email ? ` a ${account.email}` : ''}.`}
        </p>
        <form onSubmit={saveAlias} className="space-y-2">
          <label htmlFor="alias" className="block font-bold">Alias público (visible en el ranking)</label>
          <div className="flex gap-2">
            <input id="alias" value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={20} className="min-h-12 flex-1 rounded-xl border-2 border-ink/15 px-3" autoComplete="nickname" />
            <button type="submit" className="btn-secondary min-h-12">Guardar</button>
          </div>
        </form>
        {account.isAnonymous && (
          <form onSubmit={sendLink} className="space-y-2">
            <label htmlFor="email" className="block font-bold">Vincular con email (magic link)</label>
            <div className="flex gap-2">
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-12 flex-1 rounded-xl border-2 border-ink/15 px-3" autoComplete="email" />
              <button type="submit" className="btn-primary min-h-12">Enviar</button>
            </div>
            <p className="text-xs text-muted">Conservas estadísticas, récords e insignias. Tu email nunca aparece en el ranking.</p>
          </form>
        )}
        {!account.isAnonymous && <button type="button" className="btn-secondary w-full" onClick={() => void signOut()}>Cerrar sesión</button>}
        {msg && <p role="status" className="rounded-xl bg-road-soft p-3 text-road">{msg}</p>}
      </div>
    </Modal>
  );
}
