import { formatScore, plateLetters } from '../game/normalize.ts';

/**
 * Matrícula construida en HTML/CSS: borde negro, banda azul lisa y texto en MESPREG.
 * Cada carácter ocupa una casilla fija (variables --plate-c1…c7 en src/index.css),
 * igual que en las matrículas reales, así el espaciado no depende de la fuente.
 */
interface PlateProps {
  score: number;
  pattern: string;
  /** clave para relanzar la animación */
  pulse?: { kind: 'pop' | 'shake'; id: number } | null;
  label?: string;
  /** Colorea cifras y letras (modal Cómo jugar). */
  explain?: boolean;
  className?: string;
}

export function Plate({ score, pattern, pulse, label, explain = false, className = '' }: PlateProps) {
  const digits = formatScore(score);
  const letters = plateLetters(pattern);
  const anim = pulse ? (pulse.kind === 'pop' ? 'animate-pop' : 'animate-shake') : '';
  const digitColor = explain ? 'text-road' : 'text-ink';
  const letterColor = explain ? 'text-combo' : 'text-ink';
  return (
    <figure
      key={pulse?.id ?? 0}
      className={`plate mx-auto max-w-[560px] ${anim} ${className}`}
      aria-label={label ?? `Matrícula ${digits} ${letters}. Puntuación ${Number(digits)}. Consonantes ${letters.split('').join(', ')}.`}
      role="img"
      data-testid="plate"
    >
      <div className="plate-body plate-chars" aria-hidden>
        <div className="plate-band" />
        {/* Textos completos (ocultos) para tests y lectores; los visibles van por casillas. */}
        <span className="sr-only" data-testid="plate-score">{digits}</span>
        <span className="sr-only" data-testid="plate-letters">{letters}</span>
        {Array.from(digits).map((ch, i) => (
          <span key={`d${i}`} className={`plate-char ${digitColor}`} style={{ left: `var(--plate-c${i + 1})` }}>{ch}</span>
        ))}
        {Array.from(letters).map((ch, i) => (
          <span key={`l${i}`} className={`plate-char ${letterColor}`} style={{ left: `var(--plate-c${i + 5})` }}>{ch}</span>
        ))}
      </div>
    </figure>
  );
}

/** Recordatorio de las consonantes de la matrícula activa. Se re-monta en cada matrícula nueva. */
export function ConsonantHint({ pattern }: { pattern: string }) {
  const colors = ['bg-road', 'bg-ink', 'bg-combo'];
  const letters = plateLetters(pattern).split('');
  return (
    <p
      key={pattern}
      className="animate-rise mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs text-muted"
      aria-live="polite"
      data-testid="consonant-hint"
    >
      Usa estas consonantes en este orden:
      {letters.map((c, i) => (
        <span key={`${pattern}-${i}`} className={`grid h-6 w-6 place-items-center rounded-md text-xs font-black text-white ${colors[i % 3]}`}>
          {c}
        </span>
      ))}
    </p>
  );
}
