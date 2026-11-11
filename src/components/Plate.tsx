import type { CSSProperties } from 'react';
import { formatScore, plateLetters } from '../game/normalize.ts';

/**
 * Matrícula autocontenida: estilos y tipografía van aquí dentro (no depende de ningún .css).
 *
 * TIPOGRAFÍA: el archivo debe estar en  public/fonts/MESPREG.ttf
 * Comprobación: abre  https://TU-SITIO.netlify.app/fonts/MESPREG.ttf  → debe descargarse la fuente.
 *
 * ── CONTROLES DE AJUSTE ─────────────────────────────────────────────────────
 * Unidades "cqw" = 1 % del ancho de la matrícula (se ve igual en móvil y escritorio).
 */
const PLATE = {
  fontSize: '21cqw', // tamaño de cifras y letras
  tracking: '0.07em', // espacio entre caracteres de un mismo grupo
  groupGap: '0.4em', // hueco entre «0346» y «BRC»
  offsetX: '0cqw', // mover el texto a izquierda (–) o derecha (+)
  offsetY: '2.8cqw', // mover el texto arriba (–) o abajo (+)
  band: '11.5cqw', // ancho de la banda azul
  blue: '#004eb0',
  ink: '#0d0d0f',
  green: '#0a7a3c',
  purple: '#5a2bd3',
};
// ────────────────────────────────────────────────────────────────────────────

const FONT_URL = '/fonts/MESPREG.ttf';
const FONT_NAME = 'MatriculaMESPREG';

/** Declara la fuente una sola vez, desde aquí, con un nombre propio que no choca con nada. */
if (typeof document !== 'undefined' && !document.getElementById('plate-font')) {
  const style = document.createElement('style');
  style.id = 'plate-font';
  style.textContent = `@font-face{font-family:"${FONT_NAME}";src:url("${FONT_URL}") format("truetype");font-weight:normal;font-style:normal;font-display:block;}`;
  document.head.appendChild(style);
  // Aviso en la consola del navegador si la fuente no carga (F12 → Console).
  document.fonts?.load(`40px "${FONT_NAME}"`).then((faces) => {
    if (!faces.length) console.warn(`[Matrícula] No se pudo cargar ${FONT_URL}. Revisa que exista en public/fonts/.`);
  });
}

const S = {
  figure: { containerType: 'inline-size', width: '100%', maxWidth: 560, margin: '0 auto' } as CSSProperties,
  body: {
    display: 'flex',
    aspectRatio: '419 / 99',
    border: `1cqw solid ${PLATE.ink}`,
    borderRadius: '2.4cqw',
    background: '#fdfcfc',
    overflow: 'hidden',
    boxShadow: '0 0.4cqw 0 #0002, 0 3cqw 6cqw -3cqw #0006',
  } as CSSProperties,
  band: { width: PLATE.band, flex: 'none', background: PLATE.blue } as CSSProperties,
  text: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PLATE.groupGap,
    fontFamily: `"${FONT_NAME}", "DIN Condensed", "Arial Narrow", sans-serif`,
    fontWeight: 'normal',
    fontSize: PLATE.fontSize,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    transform: `translate(${PLATE.offsetX}, ${PLATE.offsetY})`,
  } as CSSProperties,
  group: { display: 'block', letterSpacing: PLATE.tracking, marginRight: `calc(-1 * ${PLATE.tracking})` } as CSSProperties,
};

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
  return (
    <figure
      key={pulse?.id ?? 0}
      className={`${anim} ${className}`}
      style={S.figure}
      aria-label={label ?? `Matrícula ${digits} ${letters}. Puntuación ${Number(digits)}. Consonantes ${letters.split('').join(', ')}.`}
      role="img"
      data-testid="plate"
    >
      <div style={S.body} aria-hidden>
        <div style={S.band} />
        <div style={S.text}>
          <span style={{ ...S.group, color: explain ? PLATE.green : PLATE.ink }} data-testid="plate-score">{digits}</span>
          <span style={{ ...S.group, color: explain ? PLATE.purple : PLATE.ink }} data-testid="plate-letters">{letters}</span>
        </div>
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
