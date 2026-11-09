import { CHALLENGES, type ChallengeId } from './challenges.ts';
import { platesForMode, type GameMode } from './config.ts';
import type { Dictionary } from './dictionary.ts';
import { mulberry32, pick } from './rng.ts';

export interface PlateSpec {
  /** Patrón en minúsculas, p. ej. "brc". */
  pattern: string;
  /** Solo en Combo de vocales. */
  challenge?: ChallengeId;
}

/**
 * Genera la secuencia de matrículas de una partida (SPEC §6).
 * - Solo patrones de 3 consonantes con al menos una solución en el diccionario procesado.
 * - No repite matrícula mientras queden alternativas.
 * - En Combo de vocales elige una condición que cumpla al menos una solución del patrón.
 */
export function generatePlates(dict: Dictionary, mode: GameMode, seed: number): PlateSpec[] {
  const rng = mulberry32(seed);
  const pool = dict.patterns().filter((p) => dict.solutions(p).length > 0).sort();
  if (pool.length === 0) throw new Error('Diccionario vacío: no hay matrículas seleccionables');
  const n = platesForMode(mode);
  const out: PlateSpec[] = [];
  let available = [...pool];
  while (out.length < n) {
    if (available.length === 0) available = [...pool];
    const idx = Math.floor(rng() * available.length);
    const pattern = available[idx];
    available.splice(idx, 1);
    if (mode === 'combo_vocales') {
      const sols = dict.solutions(pattern);
      const feasible = CHALLENGES.filter((c) => sols.some((w) => c.test(w)));
      if (feasible.length === 0) continue; // patrón sin condición posible: se descarta para este modo
      out.push({ pattern, challenge: pick(rng, feasible).id });
    } else {
      out.push({ pattern });
    }
  }
  return out;
}
