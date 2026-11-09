import { consonantsOf, letterCount, vowelsOf } from './normalize.ts';
import type { RareConsonantConfig } from './config.ts';

/** SPEC §4. A/E/O = 1; I/U = 2. Acentos y diéresis conservan el valor. */
const VOWEL_POINTS: Record<string, number> = { a: 1, e: 1, o: 1, i: 2, u: 2 };

export function vowelPoints(word: string): number {
  return vowelsOf(word).reduce((sum, v) => sum + (VOWEL_POINTS[v] ?? 0), 0);
}

export function lengthBonus(word: string): number {
  const n = letterCount(word);
  if (n <= 4) return 0;
  if (n <= 6) return 1;
  if (n <= 8) return 2;
  return 3;
}

export function rareBonus(word: string, config: RareConsonantConfig): number {
  return consonantsOf(word).reduce((sum, c) => {
    const v = config[c];
    return sum + (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  }, 0);
}

/** streak = número de aciertos consecutivos incluyendo este. */
export function comboBonus(streak: number): number {
  if (streak <= 1) return 0;
  if (streak === 2) return 1;
  return 2;
}

export interface ScoreBreakdown {
  vowels: number;
  length: number;
  rare: number;
  combo: number;
  challenge: number;
  total: number;
}

export function scoreWord(
  word: string,
  opts: { rareConfig: RareConsonantConfig; streak?: number; useCombo?: boolean; challengeBonus?: number },
): ScoreBreakdown {
  const vowels = vowelPoints(word);
  const length = lengthBonus(word);
  const rare = rareBonus(word, opts.rareConfig);
  const combo = opts.useCombo ? comboBonus(opts.streak ?? 1) : 0;
  const challenge = opts.challengeBonus ?? 0;
  return { vowels, length, rare, combo, challenge, total: vowels + length + rare + combo + challenge };
}
