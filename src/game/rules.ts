import type { Dictionary } from './dictionary.ts';
import { consonantsOf, hasOnlySpanishLetters, normalizeWord, plateLetters } from './normalize.ts';

export type RejectReason = 'vacia' | 'caracteres' | 'num_consonantes' | 'consonantes' | 'no_existe';

export type AnswerCheck =
  | { ok: true; word: string }
  | { ok: false; reason: RejectReason; message: string };

/**
 * Reglas generales (SPEC §3): exactamente 3 consonantes, iguales a las de la matrícula,
 * una vez cada una y en el mismo orden; solo se añaden vocales; la palabra debe existir
 * en el diccionario procesado (que ya excluye nombres propios, abreviaturas, etc.).
 */
export function checkAnswer(input: string, pattern: string, dict: Dictionary): AnswerCheck {
  const w = normalizeWord(input);
  if (!w) return { ok: false, reason: 'vacia', message: 'Escribe una palabra.' };
  if (!hasOnlySpanishLetters(w)) {
    return { ok: false, reason: 'caracteres', message: 'Solo letras, sin espacios ni símbolos.' };
  }
  const cons = consonantsOf(w);
  const target = Array.from(pattern);
  if (cons.length !== target.length) {
    return {
      ok: false,
      reason: 'num_consonantes',
      message: `Necesitas exactamente ${target.length} consonantes y tiene ${cons.length}.`,
    };
  }
  if (cons.join('') !== pattern) {
    return {
      ok: false,
      reason: 'consonantes',
      message: `Usa ${plateLetters(pattern).split('').join(', ')} en ese orden, sin cambiarlas.`,
    };
  }
  const canonical = dict.lookup(w);
  if (!canonical) {
    return { ok: false, reason: 'no_existe', message: 'Esa palabra no está en el diccionario del juego.' };
  }
  return { ok: true, word: canonical };
}
