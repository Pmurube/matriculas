import type { AchievementId } from '../game/achievements.ts';
import type { GameMode, RareConsonantConfig } from '../game/config.ts';
import type { GameEvent } from '../game/engine.ts';
import type { PlateSpec } from '../game/plates.ts';
import { accessToken, getSupabase } from './supabase.ts';

export type PeriodType = 'daily' | 'monthly' | 'alltime';

export interface RankInfo {
  period_type: PeriodType;
  period_key: string;
  position: number;
  best_score: number;
}

export interface SubmitOk {
  status: 'finished';
  score: number;
  ranks: RankInfo[];
  newAchievements: AchievementId[];
}
export interface SubmitRejected {
  status: 'rejected';
  reason: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function post<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const t = token ?? (await accessToken());
  if (!t) throw new ApiError(401, 'Sin sesión');
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 422) return data as T;
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export function startOnlineGame(mode: GameMode) {
  return post<{ gameId: string; plates: PlateSpec[]; rareConfig: RareConsonantConfig }>('/api/game/start', { mode });
}

export function submitOnlineGame(gameId: string, events: GameEvent[], clientElapsedMs: number) {
  return post<SubmitOk | SubmitRejected>('/api/game/submit', { gameId, events, clientElapsedMs });
}

export function mergeAnonymous(targetToken: string, anonAccessToken: string) {
  return post<{ status: string }>('/api/account/merge', { anonAccessToken }, targetToken);
}

export interface LeaderRow {
  position: number;
  alias: string;
  score: number;
  mode: GameMode;
  period_type: PeriodType;
  period_key: string;
}

export async function fetchLeaderboard(mode: GameMode, period: PeriodType): Promise<{ rows: LeaderRow[]; me: { position: number; score: number } | null }> {
  const p = getSupabase();
  if (!p) return { rows: [], me: null };
  const sb = await p;
  const [{ data, error }, mine] = await Promise.all([
    sb.rpc('get_leaderboard', { p_mode: mode, p_period: period, p_limit: 20 }),
    sb.rpc('get_my_leaderboard_position', { p_mode: mode, p_period: period }),
  ]);
  if (error) throw new Error(error.message);
  const me = Array.isArray(mine.data) && mine.data[0] ? { position: Number(mine.data[0].position), score: mine.data[0].score } : null;
  return { rows: (data ?? []) as LeaderRow[], me };
}

export interface ServerAchievement {
  achievement_id: AchievementId;
  first_unlocked_at: string;
  last_unlocked_at: string;
  times_won: number;
}

export async function fetchMyAchievements(): Promise<ServerAchievement[]> {
  const p = getSupabase();
  if (!p) return [];
  const sb = await p;
  const { data, error } = await sb.from('user_achievements').select('achievement_id, first_unlocked_at, last_unlocked_at, times_won');
  if (error) throw new Error(error.message);
  return (data ?? []) as ServerAchievement[];
}

export async function fetchMyBest(mode: GameMode): Promise<number | null> {
  const p = getSupabase();
  if (!p) return null;
  const sb = await p;
  const { data } = await sb.from('games').select('score').eq('mode', mode).eq('status', 'finished').order('score', { ascending: false }).limit(1);
  return Array.isArray(data) && data[0] ? (data[0].score as number) : null;
}
