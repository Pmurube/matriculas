import type { GameMode } from '../game/config.ts';
import { IconFlag, IconTimer } from './Icons.tsx';

const MODES: { id: GameMode; title: string; short: string; sub: string; tone: string; active: string }[] = [
  { id: 'contrarreloj', title: 'Contrarreloj', short: 'Contrarreloj', sub: '120 segundos', tone: 'text-road', active: 'border-road bg-road-soft' },
  { id: 'clasico', title: 'Clásico', short: 'Clásico', sub: '10 matrículas', tone: 'text-ink', active: 'border-ink bg-asphalt' },
  { id: 'combo_vocales', title: 'Combo de vocales', short: 'Combo', sub: 'Retos con condiciones', tone: 'text-combo', active: 'border-combo bg-combo-soft' },
];

function ModeIcon({ id }: { id: GameMode }) {
  if (id === 'contrarreloj') return <IconTimer className="h-5 w-5 sm:h-7 sm:w-7" />;
  if (id === 'clasico') return <IconFlag className="h-5 w-5 sm:h-7 sm:w-7" />;
  return (
    <span className="grid h-5 w-5 grid-cols-2 place-items-center rounded bg-combo text-[6px] font-black leading-none text-white sm:h-8 sm:w-8 sm:rounded-md sm:text-[9px]" aria-hidden>
      <span>A</span><span>E</span><span>O</span><span>U</span>
    </span>
  );
}

/** Móvil: una sola fila compacta (icono + nombre corto). Desde sm: tarjetas con descripción. */
export function ModeSelector({ value, onChange, disabled }: { value: GameMode; onChange: (m: GameMode) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Modo de juego" className="grid grid-cols-3 gap-1.5 sm:gap-3">
      {MODES.map((m) => {
        const on = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${m.title}: ${m.sub}`}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            data-testid={`mode-${m.id}`}
            className={`flex min-h-13 flex-col items-center justify-center gap-1 rounded-xl border-2 bg-white px-0.5 py-1.5 text-center transition-colors sm:min-h-16 sm:flex-row sm:justify-start sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-left ${on ? m.active : 'border-ink/10 hover:border-ink/30'}`}
          >
            <span className={m.tone}><ModeIcon id={m.id} /></span>
            <span className="min-w-0 max-w-full">
              <span className={`block truncate text-[9px] min-[360px]:text-[10px] font-black uppercase tracking-normal sm:text-sm sm:tracking-wide ${m.tone}`}>
                <span className="sm:hidden">{m.short}</span>
                <span className="hidden sm:inline">{m.title}</span>
              </span>
              <span className="hidden text-xs text-muted sm:block">{m.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
