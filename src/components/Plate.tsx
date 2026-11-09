import { formatScore, plateLetters } from '../game/normalize.ts';

/** Estrellas UE (12 en círculo), calculadas una vez. */
const STARS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  return { x: 12 + Math.cos(a) * 7.5, y: 12 + Math.sin(a) * 7.5 };
});

export function EuBand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex shrink-0 flex-col items-center justify-between bg-eu text-white ${compact ? 'w-5 rounded-l-[3px] py-0.5' : 'w-[12%] min-w-9 rounded-l-[10px] py-[3%]'}`} aria-hidden>
      <svg viewBox="0 0 24 24" className={compact ? 'h-3 w-3' : 'w-[78%]'}>
        {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={1.25} fill="var(--color-star)" />)}
      </svg>
      <span className={`plate-chars ${compact ? 'text-[9px]' : 'plate-e-size'}`}>E</span>
    </div>
  );
}

interface PlateProps {
  score: number;
  pattern: string;
  /** clave para relanzar la animación */
  pulse?: { kind: 'pop' | 'shake'; id: number } | null;
  label?: string;
}

/** Matrícula protagonista: números = puntuación, letras = reto. */
export function Plate({ score, pattern, pulse, label }: PlateProps) {
  const digits = formatScore(score);
  const letters = plateLetters(pattern);
  const anim = pulse ? (pulse.kind === 'pop' ? 'animate-pop' : 'animate-shake') : '';
  return (
    <figure
      key={pulse?.id ?? 0}
      className={`plate-frame mx-auto w-full max-w-[560px] ${anim}`}
      aria-label={label ?? `Matrícula ${digits} ${letters}. Puntuación ${Number(digits)}. Consonantes ${letters.split('').join(', ')}.`}
      role="img"
      data-testid="plate"
    >
      <div className="flex aspect-[4.4/1] w-full overflow-hidden rounded-[12px] border-[3px] border-ink bg-plate shadow-[0_2px_0_#0003,0_14px_30px_-12px_#0005] sm:border-4">
        <EuBand />
        <div className="plate-chars plate-size flex flex-1 items-center justify-center gap-[5%] text-ink">
          <span data-testid="plate-score">{digits}</span>
          <span data-testid="plate-letters">{letters}</span>
        </div>
      </div>
    </figure>
  );
}

export function ConsonantHint({ pattern }: { pattern: string }) {
  const colors = ['bg-road', 'bg-ink', 'bg-combo'];
  return (
    <p className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs text-muted">
      Usa estas consonantes en este orden:
      {plateLetters(pattern).split('').map((c, i) => (
        <span key={i} className={`grid h-6 w-6 place-items-center rounded-md text-xs font-black text-white ${colors[i % 3]}`}>{c}</span>
      ))}
    </p>
  );
}
