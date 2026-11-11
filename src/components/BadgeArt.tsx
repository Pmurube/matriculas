import type { ReactElement } from 'react';
import type { AchievementId } from '../game/achievements.ts';

/**
 * Ilustraciones de insignias inspiradas en señales de tráfico españolas.
 * SVG vectorial: nítido en cualquier tamaño. Bloqueadas = gris (filtro CSS).
 */
const INK = '#0d0d0f';
const BLUE = '#004eb0';
const RED = '#c8102e';
const GREEN = '#0a7a3c';
const PURPLE = '#5a2bd3';
const GOLD = '#e0a91b';
const GOLD_DARK = '#9a6d06';
const WHITE = '#fdfcfc';
const FONT = '"MESPREG", "Arial Narrow", Arial, sans-serif';

function T({ x = 50, y, size, fill = WHITE, children }: { x?: number; y: number; size: number; fill?: string; children: string }) {
  return (
    <text x={x} y={y} fontSize={size} fill={fill} textAnchor="middle" fontFamily={FONT} fontWeight={700}>
      {children}
    </text>
  );
}

/** Insignia de campeón: escudo con laurel, color del modo y letra del periodo. */
function Champion({ color, letter }: { color: string; letter: string }) {
  return (
    <>
      <path d="M50 6 88 18v30c0 24-17 38-38 46C29 86 12 72 12 48V18Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth="3" />
      <path d="M50 14 80 23.5V48c0 19-13 30.5-30 37.5C33 78.5 20 67 20 48V23.5Z" fill={color} />
      <g fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round">
        <path d="M30 66c-6-8-7-18-3-27" />
        <path d="M70 66c6-8 7-18 3-27" />
      </g>
      <g fill={GOLD}>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <ellipse cx={26 - i * 0.6} cy={44 + i * 8} rx="2.4" ry="4.6" transform={`rotate(-30 ${26 - i * 0.6} ${44 + i * 8})`} />
            <ellipse cx={74 + i * 0.6} cy={44 + i * 8} rx="2.4" ry="4.6" transform={`rotate(30 ${74 + i * 0.6} ${44 + i * 8})`} />
          </g>
        ))}
      </g>
      <path d="m50 24 3.2 6.6 7.2 1-5.2 5 1.3 7.2L50 40.4l-6.5 3.4 1.3-7.2-5.2-5 7.2-1Z" fill={GOLD} />
      <T y={72} size={26}>{letter}</T>
    </>
  );
}

const ART: Record<AchievementId, () => ReactElement> = {
  // Señal azul circular de obligación con el "1" de la palanca de cambios.
  primera_marcha: () => (
    <>
      <circle cx="50" cy="50" r="44" fill={BLUE} stroke={WHITE} strokeWidth="4" />
      <circle cx="50" cy="50" r="46" fill="none" stroke={INK} strokeWidth="2" opacity=".15" />
      <g stroke={WHITE} strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M34 30v40M50 30v40M66 30v20M34 50h32" />
      </g>
      <circle cx="34" cy="30" r="7" fill={WHITE} />
      <T x={34} y={34} size={11} fill={BLUE}>1</T>
    </>
  ),
  // Velocímetro verde con la aguja a tope: ×10 seguidas.
  sin_calarse: () => (
    <>
      <rect x="6" y="6" width="88" height="88" rx="18" fill={GREEN} />
      <path d="M22 62a28 28 0 1 1 56 0" fill="none" stroke={WHITE} strokeWidth="6" strokeLinecap="round" />
      <g stroke={WHITE} strokeWidth="3" strokeLinecap="round">
        <path d="M27 48l4 2M37 37l3 3.5M50 33v5M63 37l-3 3.5M73 48l-4 2" />
      </g>
      <path d="M50 62 72 44" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="62" r="5" fill={WHITE} />
      <T y={86} size={18}>×10</T>
    </>
  ),
  // Cartel azul de autopista con carretera en perspectiva.
  larga_distancia: () => (
    <>
      <rect x="6" y="10" width="88" height="80" rx="10" fill={BLUE} stroke={WHITE} strokeWidth="3" />
      <path d="M18 82 44 26h12l26 56Z" fill={INK} opacity=".55" />
      <g stroke={WHITE} strokeWidth="3.5" strokeLinecap="round">
        <path d="M50 30v6M50 44v8M50 60v10" />
      </g>
      <path d="M18 82 44 26M82 82 56 26" stroke={WHITE} strokeWidth="3" />
      <rect x="58" y="16" width="30" height="16" rx="3" fill={WHITE} />
      <T x={73} y={29} size={13} fill={BLUE}>10+</T>
    </>
  ),
  // Triángulo de peligro con un reloj: hora punta.
  hora_punta: () => (
    <>
      <path d="M50 8 94 86H6Z" fill={WHITE} stroke={RED} strokeWidth="8" strokeLinejoin="round" />
      <circle cx="50" cy="60" r="18" fill="none" stroke={INK} strokeWidth="4" />
      <path d="M50 49v11l8 5" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M44 38h12" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  // Señal de prohibición sobre un pin de GPS.
  sin_gps: () => (
    <>
      <circle cx="50" cy="50" r="44" fill={WHITE} stroke={RED} strokeWidth="9" />
      <path d="M50 26a14 14 0 0 1 14 14c0 11-14 28-14 28S36 51 36 40a14 14 0 0 1 14-14Z" fill={INK} />
      <circle cx="50" cy="40" r="5" fill={WHITE} />
      <path d="M22 78 78 22" stroke={RED} strokeWidth="8" strokeLinecap="round" />
    </>
  ),
  // Mini matrícula dorada con estrella.
  matricula_de_honor: () => (
    <>
      <circle cx="50" cy="50" r="44" fill={GOLD} stroke={GOLD_DARK} strokeWidth="3" />
      <rect x="14" y="36" width="72" height="28" rx="4" fill={WHITE} stroke={INK} strokeWidth="3" />
      <rect x="15.5" y="37.5" width="10" height="25" rx="2" fill={BLUE} />
      <path d="m56 40 3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1-7.2-3.8-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth="1.2" />
    </>
  ),
  // Las cinco vocales como fichas de colores.
  coleccionista: () => (
    <>
      <rect x="6" y="6" width="88" height="88" rx="18" fill={PURPLE} />
      {[
        ['A', 28, 32, GREEN],
        ['E', 72, 32, GOLD],
        ['I', 50, 50, WHITE],
        ['O', 28, 68, GOLD],
        ['U', 72, 68, GREEN],
      ].map(([l, x, y, c]) => (
        <g key={l as string}>
          <rect x={(x as number) - 11} y={(y as number) - 11} width="22" height="22" rx="5" fill={c as string} />
          <T x={x as number} y={(y as number) + 6.5} size={17} fill={c === WHITE ? PURPLE : WHITE}>{l as string}</T>
        </g>
      ))}
    </>
  ),
  campeon_diario_contrarreloj: () => <Champion color={GREEN} letter="D" />,
  campeon_mensual_contrarreloj: () => <Champion color={GREEN} letter="M" />,
  campeon_diario_clasico: () => <Champion color={INK} letter="D" />,
  campeon_historico_clasico: () => <Champion color={INK} letter="H" />,
};

export function BadgeArt({ id, locked = false, className = 'h-14 w-14' }: { id: AchievementId; locked?: boolean; className?: string }) {
  const Art = ART[id];
  return (
    <svg viewBox="0 0 100 100" className={`${className} shrink-0 ${locked ? 'opacity-35 grayscale' : ''}`} aria-hidden data-testid={`badge-art-${id}`}>
      <Art />
    </svg>
  );
}
