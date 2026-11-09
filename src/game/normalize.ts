/**
 * Normalización y análisis consonántico. Fuente de verdad: SPEC.md §3.
 * Este módulo lo usan el cliente, las Netlify Functions y los scripts de importación.
 */

export const VOWELS_BASE = ['a', 'e', 'i', 'o', 'u'] as const;
/** Consonantes reconocidas. La Y se trata siempre como consonante (decisión documentada en SPEC.md). */
export const CONSONANTS = [
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'ñ',
  'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z',
] as const;
export type Consonant = (typeof CONSONANTS)[number];

const CONSONANT_SET = new Set<string>(CONSONANTS);
/** Letras admitidas en una palabra (tras pasar a minúsculas NFC). */
const VOWEL_FORMS: Record<string, string> = {
  a: 'a', á: 'a',
  e: 'e', é: 'e',
  i: 'i', í: 'i',
  o: 'o', ó: 'o',
  u: 'u', ú: 'u', ü: 'u',
};

/** Minúsculas + NFC + trim. No elimina tildes. */
export function normalizeWord(input: string): string {
  return input.normalize('NFC').trim().toLocaleLowerCase('es-ES');
}

/** Devuelve la vocal base (a/e/i/o/u) o null si no es vocal válida. */
export function vowelBase(ch: string): string | null {
  return VOWEL_FORMS[ch] ?? null;
}

export function isConsonant(ch: string): ch is Consonant {
  return CONSONANT_SET.has(ch);
}

/** Separa en caracteres NFC (la ñ y las vocales acentuadas cuentan como una letra). */
export function letters(word: string): string[] {
  return Array.from(normalizeWord(word));
}

/** true si todas las letras son vocales o consonantes españolas admitidas. */
export function hasOnlySpanishLetters(word: string): boolean {
  const ls = letters(word);
  return ls.length > 0 && ls.every((ch) => vowelBase(ch) !== null || isConsonant(ch));
}

/**
 * Clave sin tildes ni diéresis (la ñ se conserva). Se usa para que el jugador pueda
 * escribir "arbol" y encontrar "árbol".
 */
export function plainKey(word: string): string {
  return letters(word)
    .map((ch) => vowelBase(ch) ?? ch)
    .join('');
}

/** Consonantes en orden, p. ej. "barco" -> ["b","r","c"]. */
export function consonantsOf(word: string): string[] {
  return letters(word).filter((ch) => isConsonant(ch));
}

/** Patrón consonántico como cadena en minúsculas: "barco" -> "brc". */
export function consonantPattern(word: string): string {
  return consonantsOf(word).join('');
}

/** Patrón listo para mostrar en la matrícula: "brc" -> "BRC". */
export function plateLetters(pattern: string): string {
  return pattern.toLocaleUpperCase('es-ES');
}

export function letterCount(word: string): number {
  return letters(word).length;
}

/** Vocales base presentes (con repetición) en orden. */
export function vowelsOf(word: string): string[] {
  const out: string[] = [];
  for (const ch of letters(word)) {
    const v = vowelBase(ch);
    if (v) out.push(v);
  }
  return out;
}

/** Puntuación siempre de 4 cifras: 27 -> "0027". Se limita a 9999. */
export function formatScore(score: number): string {
  const clamped = Math.max(0, Math.min(9999, Math.floor(score)));
  return String(clamped).padStart(4, '0');
}
