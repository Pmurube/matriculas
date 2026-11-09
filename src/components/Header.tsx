import type { ReactNode } from 'react';
import { IconBadge, IconHelp, IconTrophy, IconUser } from './Icons.tsx';

export type Overlay = 'howto' | 'ranking' | 'badges' | 'account' | null;

/** Logo oficial. Siempre funciona como botón de vuelta a la pantalla principal. */
export function Logo({ onHome }: { onHome: () => void }) {
  return (
    <button type="button" onClick={onHome} className="block shrink-0 rounded-md" aria-label="Matrículas · ir a la pantalla principal" data-testid="logo-home">
      <img src="/brand/logo.png" alt="" width={469} height={120} className="h-9 w-auto sm:h-11" draggable={false} />
    </button>
  );
}

export function Header({ open, onHome }: { open: (o: Overlay) => void; onHome: () => void }) {
  const items: { id: Exclude<Overlay, null>; label: string; icon: ReactNode }[] = [
    { id: 'howto', label: 'Cómo jugar', icon: <IconHelp /> },
    { id: 'ranking', label: 'Ranking', icon: <IconTrophy /> },
    { id: 'badges', label: 'Insignias', icon: <IconBadge /> },
    { id: 'account', label: 'Mi cuenta', icon: <IconUser /> },
  ];
  return (
    <header className="flex items-center justify-between gap-2 border-b border-ink/10 px-3 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <h1 className="m-0"><Logo onHome={onHome} /></h1>
        <p className="hidden whitespace-nowrap text-xs font-black uppercase tracking-widest md:block">Añade vocales, forma palabras</p>
      </div>
      <nav aria-label="Menú" className="flex gap-1 sm:gap-1.5">
        {items.map((it) => (
          <button key={it.id} type="button" className="btn-ghost" onClick={() => open(it.id)} aria-label={it.label} data-testid={`open-${it.id}`}>
            {it.icon}
            {it.id === 'howto' && <span className="hidden sm:inline">¿Cómo jugar?</span>}
          </button>
        ))}
      </nav>
    </header>
  );
}
