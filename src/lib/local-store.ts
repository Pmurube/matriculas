import type { AchievementId } from '../game/achievements.ts';
import type { GameMode } from '../game/config.ts';
import type { GameSummary } from '../game/engine.ts';

/** Estadísticas del dispositivo (siempre) e insignias en modo local. */
export interface LocalStats {
  gamesPlayed: number;
  solvedTotal: number;
  passedTotal: number;
  best: Partial<Record<GameMode, number>>;
  bestCombo: number;
  longestWord: string;
  achievements: Partial<Record<AchievementId, { first: string; last: string; times: number }>>;
}

const KEY = 'matriculas.local.v1';

export const EMPTY_STATS: LocalStats = { gamesPlayed: 0, solvedTotal: 0, passedTotal: 0, best: {}, bestCombo: 0, longestWord: '', achievements: {} };

export function readStats(): LocalStats {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY_STATS, ...(JSON.parse(raw) as LocalStats) } : { ...EMPTY_STATS };
  } catch {
    return { ...EMPTY_STATS };
  }
}

/** Registra la partida y devuelve las insignias desbloqueadas por primera vez. */
export function recordGame(mode: GameMode, s: GameSummary, unlocked: AchievementId[], longest: string): { stats: LocalStats; fresh: AchievementId[] } {
  const st = readStats();
  const now = new Date().toISOString();
  const fresh: AchievementId[] = [];
  const achievements = { ...st.achievements };
  for (const id of unlocked) {
    const prev = achievements[id];
    if (!prev) fresh.push(id);
    achievements[id] = prev ? { ...prev, last: now, times: prev.times + 1 } : { first: now, last: now, times: 1 };
  }
  const stats: LocalStats = {
    gamesPlayed: st.gamesPlayed + 1,
    solvedTotal: st.solvedTotal + s.solved,
    passedTotal: st.passedTotal + s.passed,
    best: { ...st.best, [mode]: Math.max(st.best[mode] ?? 0, s.score) },
    bestCombo: Math.max(st.bestCombo, s.bestCombo),
    longestWord: Array.from(longest).length > Array.from(st.longestWord).length ? longest : st.longestWord,
    achievements,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    /* almacenamiento lleno o bloqueado: se ignora */
  }
  return { stats, fresh };
}
