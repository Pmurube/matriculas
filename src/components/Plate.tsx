import { formatScore, plateLetters } from '../game/normalize.ts';

/**
 * Matrícula protagonista sobre la imagen oficial vacía (public/brand/matricula.png, 419×99).
 * El texto se dibuja en SVG con el mismo sistema de coordenadas que la imagen, así que
 * tamaño y centrado no dependen del ancho de pantalla. `textLength` fija el ancho exacto
 * de cada grupo (4 cifras y 3 letras) como en la referencia.
 */
export const PLATE_W = 419;
export const PLATE_H = 99;
/** Ajuste fino de la tipografía (unidades de la imagen). Si cambias de fuente, toca solo esto. */
const TEXT = {
  baseline: 76, // línea base: las mayúsculas quedan centradas en la zona blanca
  fontSize: 74, // con MESPREG la altura de mayúscula queda ≈ 53 u (54 % del alto, como la referencia)
  digits: { x: 63, width: 170 }, // "0346"
  letters: { x: 278, width: 117 }, // "BRC"
};

interface PlateProps {
  score: number;
  pattern: string;
  /** clave para relanzar la animación */
  pulse?: { kind: 'pop' | 'shake'; id: number } | null;
  label?: string;
  /** Colorea cifras y letras (para el modal Cómo jugar). */
  explain?: boolean;
  className?: string;
}

export function Plate({ score, pattern, pulse, label, explain = false, className = '' }: PlateProps) {
  const digits = formatScore(score);
  const letters = plateLetters(pattern);
  const anim = pulse ? (pulse.kind === 'pop' ? 'animate-pop' : 'animate-shake') : '';
  return (
    <figure
      key={pulse?.id ?? 0}
      className={`mx-auto w-full max-w-[560px] ${anim} ${className}`}
      aria-label={label ?? `Matrícula ${digits} ${letters}. Puntuación ${Number(digits)}. Consonantes ${letters.split('').join(', ')}.`}
      role="img"
      data-testid="plate"
    >
      <svg viewBox={`0 0 ${PLATE_W} ${PLATE_H}`} className="block h-auto w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.18)]" aria-hidden>
        <image href="/brand/matricula.png" x="0" y="0" width={PLATE_W} height={PLATE_H} preserveAspectRatio="none" />
        <g className="font-plate" fontSize={TEXT.fontSize}>
          <text
            x={TEXT.digits.x}
            y={TEXT.baseline}
            textLength={TEXT.digits.width}
            lengthAdjust="spacingAndGlyphs"
            fill={explain ? 'var(--color-road)' : 'var(--color-ink)'}
            data-testid="plate-score"
          >
            {digits}
          </text>
          <text
            x={TEXT.letters.x}
            y={TEXT.baseline}
            textLength={TEXT.letters.width}
            lengthAdjust="spacingAndGlyphs"
            fill={explain ? 'var(--color-combo)' : 'var(--color-ink)'}
            data-testid="plate-letters"
          >
            {letters}
          </text>
        </g>
      </svg>
    </figure>
  );
}

/** Recordatorio de las consonantes de la matrícula ACTIVA. Se re-monta en cada matrícula nueva. */
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
