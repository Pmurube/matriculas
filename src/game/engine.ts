import { getChallenge, type ChallengeId } from './challenges.ts';
import { CONTRARRELOJ_MS, type GameMode, type RareConsonantConfig, CHALLENGE_BONUS } from './config.ts';
import type { Dictionary } from './dictionary.ts';
import type { PlateSpec } from './plates.ts';
import { checkAnswer, type RejectReason } from './rules.ts';
import { scoreWord, type ScoreBreakdown } from './scoring.ts';

/**
 * Motor de partida determinista. El cliente lo aplica evento a evento y el servidor
 * reproduce exactamente el mismo registro de eventos para recalcular la puntuación
 * (SPEC §11). El total enviado por el navegador nunca se usa.
 */
export type GameEvent =
  | { t: 'attempt'; word: string; at: number }
  | { t: 'pass'; at: number };

export interface RoundResult {
  index: number;
  pattern: string;
  challenge?: ChallengeId;
  outcome: 'solved' | 'passed';
  word?: string;
  breakdown?: ScoreBreakdown;
  challengeMet?: boolean;
  failedAttempts: number;
  at: number;
}

export interface GameState {
  mode: GameMode;
  plates: PlateSpec[];
  index: number;
  score: number;
  streak: number;
  maxStreak: number;
  failedOnCurrent: number;
  rounds: RoundResult[];
  finished: boolean;
  lastAt: number;
}

export type Feedback =
  | { kind: 'correct'; round: RoundResult }
  | { kind: 'wrong'; reason: RejectReason; message: string }
  | { kind: 'passed'; round: RoundResult }
  | { kind: 'ignored'; message: string };

export interface EngineContext {
  dict: Dictionary;
  rareConfig: RareConsonantConfig;
}

export function createGame(mode: GameMode, plates: PlateSpec[]): GameState {
  return {
    mode,
    plates,
    index: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    failedOnCurrent: 0,
    rounds: [],
    finished: plates.length === 0,
    lastAt: 0,
  };
}

export function currentPlate(state: GameState): PlateSpec | null {
  return state.finished ? null : (state.plates[state.index] ?? null);
}

function advance(state: GameState): GameState {
  const index = state.index + 1;
  return { ...state, index, failedOnCurrent: 0, finished: index >= state.plates.length };
}

/** Cierra la partida (fin de tiempo o abandono controlado). */
export function finishGame(state: GameState): GameState {
  return { ...state, finished: true };
}

export function applyEvent(state: GameState, ev: GameEvent, ctx: EngineContext): { state: GameState; feedback: Feedback } {
  if (state.finished) return { state, feedback: { kind: 'ignored', message: 'La partida ha terminado.' } };
  if (state.mode === 'contrarreloj' && ev.at >= CONTRARRELOJ_MS) {
    return { state: finishGame(state), feedback: { kind: 'ignored', message: '¡Tiempo!' } };
  }
  const plate = state.plates[state.index];
  const base = { ...state, lastAt: Math.max(state.lastAt, ev.at) };

  if (ev.t === 'pass') {
    const round: RoundResult = {
      index: state.index,
      pattern: plate.pattern,
      challenge: plate.challenge,
      outcome: 'passed',
      failedAttempts: state.failedOnCurrent,
      at: ev.at,
    };
    const next = advance({ ...base, streak: 0, rounds: [...state.rounds, round] });
    return { state: next, feedback: { kind: 'passed', round } };
  }

  const check = checkAnswer(ev.word, plate.pattern, ctx.dict);
  if (!check.ok) {
    return {
      state: { ...base, streak: 0, failedOnCurrent: state.failedOnCurrent + 1 },
      feedback: { kind: 'wrong', reason: check.reason, message: check.message },
    };
  }
  const streak = state.streak + 1;
  const challenge = getChallenge(plate.challenge);
  const challengeMet = challenge ? challenge.test(check.word) : undefined;
  const breakdown = scoreWord(check.word, {
    rareConfig: ctx.rareConfig,
    streak,
    useCombo: state.mode === 'contrarreloj',
    challengeBonus: challengeMet ? CHALLENGE_BONUS : 0,
  });
  const round: RoundResult = {
    index: state.index,
    pattern: plate.pattern,
    challenge: plate.challenge,
    outcome: 'solved',
    word: check.word,
    breakdown,
    challengeMet,
    failedAttempts: state.failedOnCurrent,
    at: ev.at,
  };
  const next = advance({
    ...base,
    score: state.score + breakdown.total,
    streak,
    maxStreak: Math.max(state.maxStreak, streak),
    rounds: [...state.rounds, round],
  });
  return { state: next, feedback: { kind: 'correct', round } };
}

export interface GameSummary {
  score: number;
  solved: number;
  passed: number;
  bestWord: { word: string; points: number } | null;
  bestCombo: number;
  longestWordLength: number;
  hasAllVowelsWord: boolean;
}

export function summarize(state: GameState): GameSummary {
  let best: GameSummary['bestWord'] = null;
  let longest = 0;
  let allVowels = false;
  for (const r of state.rounds) {
    if (r.outcome !== 'solved' || !r.word || !r.breakdown) continue;
    if (!best || r.breakdown.total > best.points) best = { word: r.word, points: r.breakdown.total };
    longest = Math.max(longest, Array.from(r.word).length);
    const plain = r.word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['a', 'e', 'i', 'o', 'u'].every((v) => plain.includes(v))) allVowels = true;
  }
  return {
    score: state.score,
    solved: state.rounds.filter((r) => r.outcome === 'solved').length,
    passed: state.rounds.filter((r) => r.outcome === 'passed').length,
    bestWord: best,
    bestCombo: state.maxStreak,
    longestWordLength: longest,
    hasAllVowelsWord: allVowels,
  };
}
