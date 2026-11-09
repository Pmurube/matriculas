import {
  CLOCK_TOLERANCE_MS,
  CONTRARRELOJ_MS,
  CONTRARRELOJ_SUBMIT_GRACE_MS,
  MAX_EVENTS,
  MAX_GAME_AGE_MS,
  MAX_WORD_LENGTH,
  MIN_MS_PER_SOLVE,
  type GameMode,
  type RareConsonantConfig,
} from './config.ts';
import type { Dictionary } from './dictionary.ts';
import { applyEvent, createGame, finishGame, summarize, type GameEvent, type GameState, type GameSummary } from './engine.ts';
import type { PlateSpec } from './plates.ts';

/** Separación mínima entre dos aciertos consecutivos (además de la media MIN_MS_PER_SOLVE). */
export const MIN_GAP_BETWEEN_SOLVES_MS = 800;

export interface VerifyInput {
  mode: GameMode;
  plates: PlateSpec[];
  events: unknown;
  startedAtMs: number;
  nowMs: number;
  dict: Dictionary;
  rareConfig: RareConsonantConfig;
}

export type VerifyResult =
  | { ok: true; state: GameState; summary: GameSummary; serverElapsedMs: number }
  | { ok: false; reason: string };

function parseEvents(raw: unknown): GameEvent[] | string {
  if (!Array.isArray(raw)) return 'eventos_no_validos';
  if (raw.length > MAX_EVENTS) return 'demasiados_eventos';
  const out: GameEvent[] = [];
  let prev = 0;
  for (const e of raw) {
    if (typeof e !== 'object' || e === null) return 'evento_mal_formado';
    const ev = e as Record<string, unknown>;
    const at = ev.at;
    if (typeof at !== 'number' || !Number.isInteger(at) || at < 0) return 'tiempo_no_valido';
    if (at < prev) return 'tiempos_no_monotonos';
    prev = at;
    if (ev.t === 'pass') out.push({ t: 'pass', at });
    else if (ev.t === 'attempt') {
      if (typeof ev.word !== 'string' || ev.word.length === 0 || ev.word.length > MAX_WORD_LENGTH) return 'palabra_no_valida';
      out.push({ t: 'attempt', word: ev.word, at });
    } else return 'tipo_evento_desconocido';
  }
  return out;
}

/** Revalidación completa de una partida en servidor (SPEC §11). Pura y testeable. */
export function verifySubmission(input: VerifyInput): VerifyResult {
  const events = parseEvents(input.events);
  if (typeof events === 'string') return { ok: false, reason: events };
  const serverElapsedMs = input.nowMs - input.startedAtMs;
  if (serverElapsedMs < 0) return { ok: false, reason: 'reloj_servidor' };

  const lastAt = events.length ? events[events.length - 1].at : 0;
  if (lastAt > serverElapsedMs + CLOCK_TOLERANCE_MS) return { ok: false, reason: 'tiempo_cliente_imposible' };

  if (input.mode === 'contrarreloj') {
    if (serverElapsedMs > CONTRARRELOJ_MS + CONTRARRELOJ_SUBMIT_GRACE_MS) return { ok: false, reason: 'envio_fuera_de_plazo' };
    if (lastAt >= CONTRARRELOJ_MS) return { ok: false, reason: 'eventos_fuera_de_tiempo' };
  } else if (serverElapsedMs > MAX_GAME_AGE_MS) {
    return { ok: false, reason: 'partida_caducada' };
  }

  let state = createGame(input.mode, input.plates);
  const ctx = { dict: input.dict, rareConfig: input.rareConfig };
  let lastSolveAt = -Infinity;
  for (const ev of events) {
    if (state.finished) return { ok: false, reason: 'eventos_tras_fin' };
    const res = applyEvent(state, ev, ctx);
    if (res.feedback.kind === 'correct') {
      if (ev.at - lastSolveAt < MIN_GAP_BETWEEN_SOLVES_MS) return { ok: false, reason: 'ritmo_imposible' };
      lastSolveAt = ev.at;
    }
    state = res.state;
  }

  if (input.mode !== 'contrarreloj' && !state.finished) return { ok: false, reason: 'partida_incompleta' };
  if (input.mode === 'contrarreloj') state = finishGame(state);

  const summary = summarize(state);
  if (summary.solved * MIN_MS_PER_SOLVE > lastAt + MIN_MS_PER_SOLVE) return { ok: false, reason: 'ritmo_imposible' };
  return { ok: true, state, summary, serverElapsedMs };
}
