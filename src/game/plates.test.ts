import { describe, expect, it } from 'vitest';
import { realDictionary } from '../../tests/helpers.ts';
import { getChallenge } from './challenges.ts';
import { generatePlates } from './plates.ts';

const dict = realDictionary();

describe('generación de matrículas', () => {
  it('3 consonantes, con solución, sin repetir y reproducible por semilla', () => {
    const a = generatePlates(dict, 'contrarreloj', 42);
    expect(a).toHaveLength(80);
    expect(new Set(a.map((p) => p.pattern)).size).toBe(80);
    for (const p of a) {
      expect(p.pattern).toMatch(/^[bcdfghjklmnñpqrstvwxyz]{3}$/);
      expect(dict.solutions(p.pattern).length).toBeGreaterThan(0);
    }
    expect(generatePlates(dict, 'contrarreloj', 42)).toEqual(a);
    expect(generatePlates(dict, 'contrarreloj', 43)).not.toEqual(a);
  });
  it('combo de vocales: condición siempre alcanzable', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const plates = generatePlates(dict, 'combo_vocales', seed);
      expect(plates).toHaveLength(10);
      for (const p of plates) {
        const c = getChallenge(p.challenge)!;
        expect(dict.solutions(p.pattern).some((w) => c.test(w))).toBe(true);
      }
    }
  });
  it('clásico: 10 matrículas', () => {
    expect(generatePlates(dict, 'clasico', 7)).toHaveLength(10);
  });
});
