import { describe, expect, it } from 'vitest';
import { buildDictionary } from './dictionary.ts';
import { applyEvent, createGame, summarize, type GameEvent } from './engine.ts';

const dict = buildDictionary(['barco', 'barca', 'abarca', 'aceituna', 'murciélago']);
const ctx = { dict, rareConfig: {} };
const play = (mode: Parameters<typeof createGame>[0], patterns: string[], events: GameEvent[], challenges?: string[]) => {
  let s = createGame(mode, patterns.map((p, i) => ({ pattern: p, challenge: challenges?.[i] as never })));
  const fb = [];
  for (const e of events) {
    const r = applyEvent(s, e, ctx);
    s = r.state;
    fb.push(r.feedback.kind);
  }
  return { s, fb };
};

describe('motor', () => {
  it('combo en contrarreloj y ruptura al fallar/pasar', () => {
    const r = play('contrarreloj', ['brc', 'brc', 'brc', 'brc', 'brc'], [
      { t: 'attempt', word: 'barco', at: 2000 }, // +0
      { t: 'attempt', word: 'barca', at: 4000 }, // +1
      { t: 'attempt', word: 'abarca', at: 6000 }, // +2
      { t: 'attempt', word: 'xxx', at: 7000 }, // fallo: rompe
      { t: 'attempt', word: 'barco', at: 9000 }, // +0
      { t: 'pass', at: 10000 },
    ]);
    const combos = r.s.rounds.filter((x) => x.outcome === 'solved').map((x) => x.breakdown!.combo);
    expect(combos).toEqual([0, 1, 2, 0]);
    expect(r.s.maxStreak).toBe(3);
    expect(r.s.rounds[3].failedAttempts).toBe(1);
    expect(r.s.rounds[4].outcome).toBe('passed');
  });
  it('sin combo fuera de contrarreloj y fin tras 10 matrículas', () => {
    const plates = Array(10).fill('brc');
    const events: GameEvent[] = plates.map((_, i) => ({ t: 'attempt', word: 'barco', at: (i + 1) * 2000 }));
    const { s } = play('clasico', plates, events);
    expect(s.finished).toBe(true);
    expect(s.score).toBe(30); // 10 × (2 vocales + 1 longitud)
    expect(summarize(s)).toMatchObject({ solved: 10, passed: 0, bestCombo: 10 });
  });
  it('contrarreloj termina a los 120 s', () => {
    const { s, fb } = play('contrarreloj', ['brc', 'brc'], [{ t: 'attempt', word: 'barco', at: 120_000 }]);
    expect(s.finished).toBe(true);
    expect(fb).toEqual(['ignored']);
    expect(s.score).toBe(0);
  });
  it('combo de vocales: +3 si cumple el reto, avanza aunque no lo cumpla', () => {
    const { s } = play('combo_vocales', ['brc', 'brc'], [
      { t: 'attempt', word: 'barco', at: 2000 }, // sin_a: no cumple
      { t: 'attempt', word: 'barco', at: 4000 }, // tres_vocales? no (2) → no
    ], ['sin_a', 'usa_u']);
    expect(s.rounds.map((r) => r.challengeMet)).toEqual([false, false]);
    const met = play('combo_vocales', ['brc'], [{ t: 'attempt', word: 'abarca', at: 2000 }], ['tres_vocales']);
    expect(met.s.rounds[0].breakdown!.challenge).toBe(3);
  });
  it('resumen: mejor palabra, longitud y coleccionista', () => {
    expect(summarize(createGame('clasico', [{ pattern: 'brc' }])).bestWord).toBe(null);
    const r = play('combo_vocales', ['ctn'], [{ t: 'attempt', word: 'aceituna', at: 3000 }]);
    expect(summarize(r.s)).toMatchObject({ bestWord: { word: 'aceituna' }, longestWordLength: 8, hasAllVowelsWord: false });
    const m = play('combo_vocales', ['brc'], [{ t: 'attempt', word: 'murciélago', at: 3000 }]);
    expect(m.s.rounds).toHaveLength(0); // 5 consonantes: fallo, no avanza
    expect(m.s.failedOnCurrent).toBe(1);
  });
});
