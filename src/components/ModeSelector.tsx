import type { GameMode } from '../game/config.ts';
import { IconFlag, IconTimer } from './Icons.tsx';

const MODES: { id: GameMode; title: string; sub: string; tone: string; active: string }[] = [
  { id: 'contrarreloj', title: 'Contrarreloj', sub: '120 segundos · ranking diario y mensual', tone: 'text-road', active: 'border-road bg-road-soft' },
  { id: 'clasico', title: 'Clásico', sub: '10 matrículas · ranking diario e histórico', tone: 'text-ink', active: 'border-ink bg-asphalt' },
  { id: 'combo_vocales', title: 'Combo de vocales', sub: '10 matrículas · retos con condiciones', tone: 'text-combo', active: 'border-combo bg-combo-soft' },
];

function ModeIcon({ id }: { id: GameMode }) {
  if (id === 'contrarreloj') return <IconTimer className="h-7 w-7" />;
  if (id === 'clasico') return <IconFlag className="h-7 w-7" />;
  return (
    <span className="grid h-8 w-8 grid-cols-2 place-items-center rounded-md bg-combo text-[9px] font-black leading-none text-white" aria-hidden>
      <span>A</span><span>E</span><span>O</span><span>U</span>
    </span>
  );
}

export function ModeSelector({ value, onChange, disabled }: { value: GameMode; onChange: (m: GameMode) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Modo de juego" className="grid gap-2 sm:grid-cols-3 sm:gap-3">
      {MODES.map((m) => {
        const on = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            data-testid={`mode-${m.id}`}
            className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-left transition-colors ${on ? m.active : 'border-ink/10 hover:border-ink/30'}`}
          >
            <span className={m.tone}><ModeIcon id={m.id} /></span>
            <span>
              <span className={`block text-sm font-black uppercase tracking-wide ${m.tone}`}>{m.title}</span>
              <span className="block text-xs text-muted">{m.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
