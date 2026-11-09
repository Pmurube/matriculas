import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMerge, handleStart, handleSubmit, resetDictionaryCache } from './handlers.ts';
import type { ServerDeps } from './supabase-admin.ts';

const GAME_ID = '11111111-2222-4333-8444-555555555555';
const STARTED = '2026-11-09T10:00:00.000Z';
const at = (ms: number) => new Date(Date.parse(STARTED) + ms).toISOString();

function deps(over: Partial<{ game: Record<string, unknown> | null; user: { id: string; is_anonymous: boolean } | null }> = {}) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const game = over.game === undefined
    ? { id: GAME_ID, user_id: 'u1', mode: 'clasico', status: 'active', plates: Array(10).fill({ pattern: 'brc' }), started_at: STARTED, server_now: at(60_000), rare_config: {}, honor_threshold: 100, recent_submits: 0 }
    : over.game;
  const d: ServerDeps = {
    getUser: vi.fn(async (t: string) => (t === 'anon-token' ? { id: 'anon', is_anonymous: true } : t ? (over.user === undefined ? { id: 'u1', is_anonymous: false } : over.user) : null)),
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === 'dictionary_snapshot') return ['barco', 'barca', 'abarca'];
      if (fn === 'get_game_for_submit') return game;
      if (fn === 'start_game') return GAME_ID;
      if (fn === 'finalize_game') return { status: 'finished', ranks: [{ period_type: 'daily', position: 1 }], new_achievements: ['primera_marcha'] };
      if (fn === 'merge_users') return { moved_games: 2 };
      throw new Error('unexpected ' + fn);
    }) as ServerDeps['rpc'],
    select: vi.fn(async () => []) as ServerDeps['select'],
  };
  return { d, calls };
}

const post = (path: string, body: unknown, token = 'tok', headers: Record<string, string> = {}) =>
  new Request(`https://app.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...headers },
    body: JSON.stringify(body),
  });

const tenSolves = Array.from({ length: 10 }, (_, i) => ({ t: 'attempt', word: 'barco', at: (i + 1) * 3000 }));

beforeEach(() => resetDictionaryCache());

describe('POST /api/game/start', () => {
  it('crea partida con secuencia generada en servidor', async () => {
    const { d, calls } = deps();
    const res = await handleStart(post('/api/game/start', { mode: 'clasico' }), d);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gameId).toBe(GAME_ID);
    expect(body.plates).toHaveLength(10);
    expect(calls.find((c) => c.fn === 'start_game')?.args.p_user).toBe('u1');
  });
  it('401 sin usuario, 400 con modo inválido, 405 con GET, 403 con origen ajeno', async () => {
    expect((await handleStart(post('/api/game/start', { mode: 'clasico' }, ''), deps().d)).status).toBe(401);
    expect((await handleStart(post('/api/game/start', { mode: 'turbo' }), deps().d)).status).toBe(400);
    expect((await handleStart(new Request('https://app.test/api/game/start'), deps().d)).status).toBe(405);
    expect((await handleStart(post('/api/game/start', { mode: 'clasico' }, 'tok', { origin: 'https://evil.test' }), deps().d)).status).toBe(403);
  });
});

describe('POST /api/game/submit', () => {
  it('ignora el total enviado por el cliente y recalcula', async () => {
    const { d, calls } = deps();
    const res = await handleSubmit(post('/api/game/submit', { gameId: GAME_ID, events: tenSolves, clientElapsedMs: 31_000, score: 9999 }), d);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(30);
    const fin = calls.find((c) => c.fn === 'finalize_game')!.args.p_result as Record<string, unknown>;
    expect(fin.score).toBe(30);
    expect(fin.achievements).toContain('sin_calarse');
    expect((fin.rounds as unknown[]).length).toBe(10);
  });
  it('409 si ya se envió, 403 si es de otro usuario, 404 si no existe', async () => {
    expect((await handleSubmit(post('/api/game/submit', { gameId: GAME_ID, events: [] }), deps({ game: { ...deps().d, status: 'finished', user_id: 'u1' } as never }).d)).status).toBe(409);
    expect((await handleSubmit(post('/api/game/submit', { gameId: GAME_ID, events: [] }), deps({ user: { id: 'otro', is_anonymous: true } }).d)).status).toBe(403);
    expect((await handleSubmit(post('/api/game/submit', { gameId: GAME_ID, events: [] }), deps({ game: null }).d)).status).toBe(404);
    expect((await handleSubmit(post('/api/game/submit', { gameId: 'x', events: [] }), deps().d)).status).toBe(400);
  });
  it('marca como rechazada una partida manipulada', async () => {
    const { d, calls } = deps();
    const fast = Array.from({ length: 10 }, (_, i) => ({ t: 'attempt', word: 'barco', at: (i + 1) * 100 }));
    const res = await handleSubmit(post('/api/game/submit', { gameId: GAME_ID, events: fast }), d);
    expect(res.status).toBe(422);
    expect((await res.json()).reason).toBe('ritmo_imposible');
    expect((calls.find((c) => c.fn === 'finalize_game')!.args.p_result as { status: string }).status).toBe('rejected');
  });
});

describe('POST /api/account/merge', () => {
  it('fusiona anónimo → cuenta', async () => {
    const { d, calls } = deps();
    const res = await handleMerge(post('/api/account/merge', { anonAccessToken: 'anon-token' }), d);
    expect(res.status).toBe(200);
    expect(calls.find((c) => c.fn === 'merge_users')!.args).toEqual({ p_from: 'anon', p_to: 'u1' });
  });
  it('rechaza si el destino es anónimo o el origen no lo es', async () => {
    expect((await handleMerge(post('/api/account/merge', { anonAccessToken: 'anon-token' }), deps({ user: { id: 'u1', is_anonymous: true } }).d)).status).toBe(401);
    expect((await handleMerge(post('/api/account/merge', { anonAccessToken: 'tok' }), deps().d)).status).toBe(400);
  });
});
