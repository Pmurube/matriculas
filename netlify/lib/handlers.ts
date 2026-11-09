/**
 * Lógica de las funciones sensibles (SPEC §9). Recibe dependencias inyectadas para
 * poder testearla sin Supabase real. El servidor NUNCA usa el total enviado por el navegador.
 */
import { evaluateGameAchievements } from '../../src/game/achievements.ts';
import { MODES, type GameMode, type RareConsonantConfig } from '../../src/game/config.ts';
import { buildDictionary, type Dictionary } from '../../src/game/dictionary.ts';
import { generatePlates, type PlateSpec } from '../../src/game/plates.ts';
import { randomSeed } from '../../src/game/rng.ts';
import { verifySubmission } from '../../src/game/verify.ts';
import { bearer, clientIp, json, memoryRateLimit, readJson, UUID_RE } from './http.ts';
import { RpcError, type ServerDeps } from './supabase-admin.ts';

const DICT_TTL_MS = 10 * 60 * 1000;
let dictCache: { dict: Dictionary; at: number } | null = null;

export async function loadDictionary(deps: ServerDeps, now = Date.now()): Promise<Dictionary> {
  if (dictCache && now - dictCache.at < DICT_TTL_MS) return dictCache.dict;
  const words = await deps.rpc<string[]>('dictionary_snapshot', {});
  const dict = buildDictionary(words ?? []);
  dictCache = { dict, at: now };
  return dict;
}

export function resetDictionaryCache() {
  dictCache = null;
}

function rpcStatus(e: unknown): Response {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('rate_limited')) return json(429, { error: 'rate_limited' });
  if (msg.includes('already_submitted')) return json(409, { error: 'already_submitted' });
  if (msg.includes('forbidden')) return json(403, { error: 'forbidden' });
  if (msg.includes('game_not_found') || msg.includes('profile_not_found')) return json(404, { error: 'not_found' });
  if (msg.includes('source_not_anonymous') || msg.includes('same_user')) return json(400, { error: 'invalid_merge' });
  console.error('[api] error', e instanceof RpcError ? `${e.status} ${e.message}` : msg);
  return json(500, { error: 'server_error' });
}

// ── POST /api/game/start ────────────────────────────────────────────────────
export async function handleStart(req: Request, deps: ServerDeps): Promise<Response> {
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  if (!memoryRateLimit(`start:${clientIp(req)}`, 30, 60_000)) return json(429, { error: 'rate_limited' });
  const user = await deps.getUser(bearer(req));
  if (!user) return json(401, { error: 'unauthorized' });
  const mode = parsed.body.mode;
  if (typeof mode !== 'string' || !MODES.includes(mode as GameMode)) return json(400, { error: 'invalid_mode' });

  try {
    const dict = await loadDictionary(deps);
    const seed = randomSeed() & 0x7fffffff;
    const plates = generatePlates(dict, mode as GameMode, seed);
    const gameId = await deps.rpc<string>('start_game', { p_user: user.id, p_mode: mode, p_seed: seed, p_plates: plates });
    const rare = await deps.select<{ consonant: string; bonus: number }[]>('rare_consonant_config?select=consonant,bonus&bonus=gt.0');
    const rareConfig: RareConsonantConfig = Object.fromEntries(rare.map((r) => [r.consonant, r.bonus]));
    return json(200, { gameId, mode, plates, rareConfig });
  } catch (e) {
    return rpcStatus(e);
  }
}

interface GameRow {
  id: string;
  user_id: string;
  mode: GameMode;
  status: string;
  plates: PlateSpec[];
  started_at: string;
  server_now: string;
  rare_config: RareConsonantConfig;
  honor_threshold: number;
  recent_submits: number;
}

// ── POST /api/game/submit ───────────────────────────────────────────────────
export async function handleSubmit(req: Request, deps: ServerDeps): Promise<Response> {
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  if (!memoryRateLimit(`submit:${clientIp(req)}`, 30, 60_000)) return json(429, { error: 'rate_limited' });
  const user = await deps.getUser(bearer(req));
  if (!user) return json(401, { error: 'unauthorized' });

  const { gameId, events, clientElapsedMs } = parsed.body;
  if (typeof gameId !== 'string' || !UUID_RE.test(gameId)) return json(400, { error: 'invalid_game_id' });
  const clientMs = typeof clientElapsedMs === 'number' && Number.isFinite(clientElapsedMs) ? Math.round(clientElapsedMs) : null;

  try {
    const game = await deps.rpc<GameRow | null>('get_game_for_submit', { p_game_id: gameId });
    if (!game) return json(404, { error: 'not_found' });
    if (game.user_id !== user.id) return json(403, { error: 'forbidden' });
    if (game.status !== 'active') return json(409, { error: 'already_submitted' });
    if (game.recent_submits >= 10) return json(429, { error: 'rate_limited' });

    const dict = await loadDictionary(deps);
    const verdict = verifySubmission({
      mode: game.mode,
      plates: game.plates,
      events,
      startedAtMs: Date.parse(game.started_at),
      nowMs: Date.parse(game.server_now),
      dict,
      rareConfig: game.rare_config ?? {},
    });

    if (!verdict.ok) {
      await deps.rpc('finalize_game', {
        p_game_id: gameId,
        p_user: user.id,
        p_result: { status: 'rejected', reason: verdict.reason, client_elapsed_ms: clientMs },
      });
      return json(422, { status: 'rejected', reason: verdict.reason });
    }

    const { summary, state, serverElapsedMs } = verdict;
    const result = {
      status: 'finished',
      score: summary.score,
      solved: summary.solved,
      passed: summary.passed,
      best_word: summary.bestWord?.word ?? null,
      best_combo: summary.bestCombo,
      client_elapsed_ms: clientMs,
      server_elapsed_ms: serverElapsedMs,
      achievements: evaluateGameAchievements(game.mode, summary, game.honor_threshold),
      rounds: state.rounds.map((r) => ({
        round_index: r.index,
        pattern: r.pattern,
        challenge: r.challenge ?? null,
        outcome: r.outcome,
        word: r.word ?? null,
        points: r.breakdown?.total ?? 0,
        vowel_points: r.breakdown?.vowels ?? 0,
        length_bonus: r.breakdown?.length ?? 0,
        rare_bonus: r.breakdown?.rare ?? 0,
        combo_bonus: r.breakdown?.combo ?? 0,
        challenge_bonus: r.breakdown?.challenge ?? 0,
        failed_attempts: r.failedAttempts,
        at_ms: r.at,
      })),
    };
    const saved = await deps.rpc<{ ranks: unknown[]; new_achievements: string[] }>('finalize_game', {
      p_game_id: gameId,
      p_user: user.id,
      p_result: result,
    });
    return json(200, {
      status: 'finished',
      score: summary.score,
      solved: summary.solved,
      passed: summary.passed,
      bestWord: summary.bestWord,
      bestCombo: summary.bestCombo,
      ranks: saved?.ranks ?? [],
      newAchievements: saved?.new_achievements ?? [],
    });
  } catch (e) {
    return rpcStatus(e);
  }
}

// ── POST /api/account/merge ─────────────────────────────────────────────────
export async function handleMerge(req: Request, deps: ServerDeps): Promise<Response> {
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  if (!memoryRateLimit(`merge:${clientIp(req)}`, 5, 60_000)) return json(429, { error: 'rate_limited' });
  const target = await deps.getUser(bearer(req));
  if (!target || target.is_anonymous) return json(401, { error: 'unauthorized' });
  const anonToken = parsed.body.anonAccessToken;
  if (typeof anonToken !== 'string' || anonToken.length > 4096) return json(400, { error: 'invalid_token' });
  const source = await deps.getUser(anonToken);
  if (!source) return json(400, { error: 'anon_session_expired' });
  if (!source.is_anonymous || source.id === target.id) return json(400, { error: 'invalid_merge' });
  try {
    const out = await deps.rpc('merge_users', { p_from: source.id, p_to: target.id });
    return json(200, { status: 'merged', ...(out as object) });
  } catch (e) {
    return rpcStatus(e);
  }
}

// ── Scheduled: award-champions ──────────────────────────────────────────────
export async function runAwardChampions(deps: ServerDeps): Promise<unknown> {
  return deps.rpc('award_period_champions', {});
}
