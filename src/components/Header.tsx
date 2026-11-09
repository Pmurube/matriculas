import type { ReactNode } from 'react';
import { EuBand } from './Plate.tsx';
import { IconBadge, IconHelp, IconTrophy, IconUser } from './Icons.tsx';

export type Overlay = 'howto' | 'ranking' | 'badges' | 'account' | null;

export function Logo() {
  return (
    <div className="flex h-9 shrink-0 items-stretch sm:h-10 overflow-hidden rounded-[6px] border-[2.5px] border-ink bg-plate" aria-label="Matrículas">
      <EuBand compact />
      <span className="plate-chars flex items-center px-1.5 text-[17px] tracking-[0.05em] sm:px-2 sm:text-[22px] sm:tracking-[0.08em]" aria-hidden>
        MATR<span className="text-road">Í</span>CULAS
      </span>
    </div>
  );
}

export function Header({ open }: { open: (o: Overlay) => void }) {
  const items: { id: Exclude<Overlay, null>; label: string; icon: ReactNode }[] = [
    { id: 'howto', label: 'Cómo jugar', icon: <IconHelp /> },
    { id: 'ranking', label: 'Ranking', icon: <IconTrophy /> },
    { id: 'badges', label: 'Insignias', icon: <IconBadge /> },
    { id: 'account', label: 'Mi cuenta', icon: <IconUser /> },
  ];
  return (
    <header className="flex items-center justify-between gap-2 border-b border-ink/10 px-3 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <h1><Logo /></h1>
      </div>
      <nav aria-label="Menú" className="flex gap-1 sm:gap-1.5">
        {items.map((it) => (
          <button key={it.id} type="button" className="btn-ghost" onClick={() => open(it.id)} aria-label={it.label} data-testid={`open-${it.id}`}>
            {it.icon}
            <span className={it.id === 'howto' ? 'hidden sm:inline' : 'hidden md:inline'}>{it.id === 'howto' ? '¿Cómo jugar?' : it.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
