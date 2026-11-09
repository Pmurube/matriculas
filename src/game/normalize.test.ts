import { describe, expect, it } from 'vitest';
import { consonantPattern, formatScore, letterCount, normalizeWord, plainKey, vowelsOf } from './normalize.ts';

describe('normalize', () => {
  it('normaliza a NFC minúsculas', () => {
    expect(normalizeWord('  A\u0301RBOL ')).toBe('árbol');
    expect(normalizeWord('Árbol')).toBe('árbol');
  });
  it('plainKey quita tildes y diéresis pero conserva la ñ', () => {
    expect(plainKey('árbol')).toBe('arbol');
    expect(plainKey('pingüino')).toBe('pinguino');
    expect(plainKey('caña')).toBe('caña');
  });
  it('extrae el patrón consonántico en orden (Y y H son consonantes, RR son dos R)', () => {
    expect(consonantPattern('barco')).toBe('brc');
    expect(consonantPattern('barraca')).toBe('brrc');
    expect(consonantPattern('ayudar')).toBe('ydr');
    expect(consonantPattern('hacha')).toBe('hch');
    expect(consonantPattern('cañón')).toBe('cñn');
  });
  it('cuenta letras y vocales con ü como u', () => {
    expect(letterCount('pingüino')).toBe(8);
    expect(vowelsOf('agüero')).toEqual(['a', 'u', 'e', 'o']);
  });
  it('formatea la puntuación con 4 cifras', () => {
    expect(formatScore(27)).toBe('0027');
    expect(formatScore(0)).toBe('0000');
    expect(formatScore(12345)).toBe('9999');
    expect(formatScore(-3)).toBe('0000');
  });
});
