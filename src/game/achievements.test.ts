import { describe, expect, it } from 'vitest';
import { evaluateGameAchievements } from './achievements.ts';
import type { GameSummary } from './engine.ts';

const s = (o: Partial<GameSummary>): GameSummary => ({ score: 10, solved: 1, passed: 0, bestWord: null, bestCombo: 1, longestWordLength: 5, hasAllVowelsWord: false, ...o });

describe('insignias de progreso', () => {
  it('primera marcha siempre', () => expect(evaluateGameAchievements('clasico', s({ solved: 3, passed: 7 }))).toEqual(['primera_marcha']));
  it('todas las condiciones', () => {
    expect(evaluateGameAchievements('contrarreloj', s({ bestCombo: 10, longestWordLength: 10, solved: 15, score: 101, hasAllVowelsWord: true }), 100)).toEqual([
      'primera_marcha', 'sin_calarse', 'larga_distancia', 'hora_punta', 'matricula_de_honor', 'coleccionista',
    ]);
  });
  it('sin GPS solo en clásico 10/10 sin pasar; honor estrictamente mayor que el umbral', () => {
    expect(evaluateGameAchievements('clasico', s({ solved: 10, passed: 0, score: 100 }), 100)).toEqual(['primera_marcha', 'sin_gps']);
    expect(evaluateGameAchievements('combo_vocales', s({ solved: 10, passed: 0 }))).not.toContain('sin_gps');
  });
});
