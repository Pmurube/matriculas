import { describe, expect, it } from 'vitest';
import { comboBonus, lengthBonus, rareBonus, scoreWord, vowelPoints } from './scoring.ts';

describe('scoring', () => {
  it('vocales: A/E/O = 1, I/U = 2, acentos y ü conservan valor', () => {
    expect(vowelPoints('barco')).toBe(2);
    expect(vowelPoints('bárico')).toBe(4);
    expect(vowelPoints('agüero')).toBe(5);
    expect(vowelPoints('úlcera')).toBe(4);
  });
  it('bonus de longitud', () => {
    expect(lengthBonus('ancla')).toBe(1);
    expect(lengthBonus('ojo')).toBe(0);
    expect(lengthBonus('casa')).toBe(0);
    expect(lengthBonus('barcos')).toBe(1);
    expect(lengthBonus('abacero')).toBe(2);
    expect(lengthBonus('aceitera')).toBe(2);
    expect(lengthBonus('abaniqueo')).toBe(3);
  });
  it('rareza configurable; sin configuración = 0', () => {
    expect(rareBonus('taxi', {})).toBe(0);
    expect(rareBonus('exótico', { x: 3 })).toBe(3);
    expect(rareBonus('exótico', { x: -2 })).toBe(0);
  });
  it('combo: +0, +1, +2, +2…', () => {
    expect([1, 2, 3, 4, 9].map(comboBonus)).toEqual([0, 1, 2, 2, 2]);
  });
  it('suma total', () => {
    expect(scoreWord('barco', { rareConfig: {}, streak: 3, useCombo: true })).toEqual({ vowels: 2, length: 1, rare: 0, combo: 2, challenge: 0, total: 5 });
    expect(scoreWord('barco', { rareConfig: {}, streak: 3, useCombo: false, challengeBonus: 3 }).total).toBe(6);
  });
});
