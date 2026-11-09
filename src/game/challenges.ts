import { letterCount, vowelsOf } from './normalize.ts';

/** Condiciones del modo Combo de vocales (SPEC §5). */
export type ChallengeId =
  | 'usa_i'
  | 'usa_u'
  | 'sin_a'
  | 'sin_e'
  | 'tres_vocales'
  | 'tres_vocales_distintas'
  | 'siete_letras';

export interface Challenge {
  id: ChallengeId;
  label: string;
  test: (word: string) => boolean;
}

export const CHALLENGES: Challenge[] = [
  { id: 'usa_i', label: 'Usa una I', test: (w) => vowelsOf(w).includes('i') },
  { id: 'usa_u', label: 'Usa una U', test: (w) => vowelsOf(w).includes('u') },
  { id: 'sin_a', label: 'No uses A', test: (w) => !vowelsOf(w).includes('a') },
  { id: 'sin_e', label: 'No uses E', test: (w) => !vowelsOf(w).includes('e') },
  { id: 'tres_vocales', label: 'Usa exactamente tres vocales', test: (w) => vowelsOf(w).length === 3 },
  {
    id: 'tres_vocales_distintas',
    label: 'Usa al menos tres vocales diferentes',
    test: (w) => new Set(vowelsOf(w)).size >= 3,
  },
  { id: 'siete_letras', label: 'Forma una palabra de siete letras o más', test: (w) => letterCount(w) >= 7 },
];

const BY_ID = new Map(CHALLENGES.map((c) => [c.id, c]));

export function getChallenge(id: string | null | undefined): Challenge | null {
  if (!id) return null;
  return BY_ID.get(id as ChallengeId) ?? null;
}
