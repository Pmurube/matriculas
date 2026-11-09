/** Constantes de juego. Fuente de verdad: SPEC.md §4, §5 y §11. */

export type GameMode = 'contrarreloj' | 'clasico' | 'combo_vocales';

export const MODES: GameMode[] = ['contrarreloj', 'clasico', 'combo_vocales'];

export const MODE_LABEL: Record<GameMode, string> = {
  contrarreloj: 'Contrarreloj',
  clasico: 'Clásico',
  combo_vocales: 'Combo de vocales',
};

export const CONTRARRELOJ_MS = 120_000;
/** Matrículas que el servidor reparte en Contrarreloj (cota superior de rondas). */
export const CONTRARRELOJ_PLATES = 80;
export const CLASSIC_PLATES = 10;
export const COMBO_PLATES = 10;

export const CHALLENGE_BONUS = 3;

/** Anti-trampas (SPEC §11). */
export const MIN_MS_PER_SOLVE = 1_500;
export const CLOCK_TOLERANCE_MS = 3_000;
export const CONTRARRELOJ_SUBMIT_GRACE_MS = 30_000;
export const MAX_GAME_AGE_MS = 24 * 60 * 60 * 1000;
export const MAX_EVENTS = 600;
export const MAX_WORD_LENGTH = 30;

export function platesForMode(mode: GameMode): number {
  if (mode === 'contrarreloj') return CONTRARRELOJ_PLATES;
  if (mode === 'clasico') return CLASSIC_PLATES;
  return COMBO_PLATES;
}

/** Bonus de rareza: consonante -> puntos. Vacío = 0 para todas (SPEC §4). */
export type RareConsonantConfig = Partial<Record<string, number>>;

export const EMPTY_RARE_CONFIG: RareConsonantConfig = {};
