import { useCallback, useEffect, useRef, useState } from 'react';
import { evaluateGameAchievements, type AchievementId } from '../game/achievements.ts';
import { CONTRARRELOJ_MS, EMPTY_RARE_CONFIG, type GameMode, type RareConsonantConfig } from '../game/config.ts';
import type { Dictionary } from '../game/dictionary.ts';
import { applyEvent, createGame, finishGame, summarize, type Feedback, type GameEvent, type GameState, type GameSummary } from '../game/engine.ts';
import { generatePlates } from '../game/plates.ts';
import { randomSeed } from '../game/rng.ts';
import { startOnlineGame, submitOnlineGame, type RankInfo } from '../lib/api.ts';
import { recordGame } from '../lib/local-store.ts';

export type Phase = 'idle' | 'starting' | 'playing' | 'submitting' | 'result';

export interface GameResult {
  mode: GameMode;
  summary: GameSummary;
  score: number;
  newAchievements: AchievementId[];
  ranks: RankInfo[];
  saved: 'local' | 'online' | 'rejected' | 'error';
  note?: string;
}

export function useGame(dict: Dictionary | null, online: boolean) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [state, setState] = useState<GameState | null>(null);
  const [feedback, setFeedback] = useState<{ id: number; fb: Feedback } | null>(null);
  const [remainingMs, setRemainingMs] = useState(CONTRARRELOJ_MS);
  const [result, setResult] = useState<GameResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const startRef = useRef(0);
  const eventsRef = useRef<GameEvent[]>([]);
  const stateRef = useRef<GameState | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const rareRef = useRef<RareConsonantConfig>(EMPTY_RARE_CONFIG);
  const finishingRef = useRef(false);
  const fbId = useRef(0);

  const elapsed = () => Math.round(performance.now() - startRef.current);

  const finish = useCallback(async () => {
    const st = stateRef.current;
    if (!st || finishingRef.current) return;
    finishingRef.current = true;
    const final = finishGame(st);
    stateRef.current = final;
    setState(final);
    setPhase('submitting');
    const summary = summarize(final);
    const longest = final.rounds.reduce((a, r) => (r.word && Array.from(r.word).length > Array.from(a).length ? r.word : a), '');
    const local = recordGame(final.mode, summary, evaluateGameAchievements(final.mode, summary), longest);
    const base: GameResult = { mode: final.mode, summary, score: summary.score, newAchievements: local.fresh, ranks: [], saved: 'local' };

    if (gameIdRef.current) {
      try {
        const res = await submitOnlineGame(gameIdRef.current, eventsRef.current, elapsed());
        if (res.status === 'finished') {
          setResult({ ...base, score: res.score, ranks: res.ranks, newAchievements: res.newAchievements, saved: 'online' });
        } else {
          setResult({ ...base, saved: 'rejected', note: `El servidor no ha validado la partida (${res.reason}). No cuenta para el ranking.` });
        }
      } catch {
        setResult({ ...base, saved: 'error', note: 'No se pudo guardar en el servidor. La partida queda solo en este dispositivo.' });
      }
    } else {
      setResult(base);
    }
    setPhase('result');
  }, []);

  const start = useCallback(async (mode: GameMode) => {
    if (!dict) return;
    setPhase('starting');
    setNotice(null);
    setResult(null);
    setFeedback(null);
    finishingRef.current = false;
    eventsRef.current = [];
    gameIdRef.current = null;
    rareRef.current = EMPTY_RARE_CONFIG;
    let plates = null;
    if (online) {
      try {
        const g = await startOnlineGame(mode);
        plates = g.plates;
        gameIdRef.current = g.gameId;
        rareRef.current = g.rareConfig ?? EMPTY_RARE_CONFIG;
      } catch (e) {
        const status = (e as { status?: number }).status;
        setNotice(status === 429 ? 'Demasiadas partidas seguidas: esta no contará para el ranking.' : 'Sin conexión con el servidor: partida sin ranking.');
      }
    }
    plates ??= generatePlates(dict, mode, randomSeed());
    const st = createGame(mode, plates);
    stateRef.current = st;
    setState(st);
    setRemainingMs(CONTRARRELOJ_MS);
    startRef.current = performance.now();
    setPhase('playing');
  }, [dict, online]);

  const dispatch = useCallback((ev: GameEvent) => {
    const st = stateRef.current;
    if (!st || !dict || st.finished || finishingRef.current) return;
    if (st.mode === 'contrarreloj' && ev.at >= CONTRARRELOJ_MS) {
      void finish();
      return;
    }
    const { state: next, feedback: fb } = applyEvent(st, ev, { dict, rareConfig: rareRef.current });
    if (fb.kind === 'ignored') return;
    eventsRef.current.push(ev);
    stateRef.current = next;
    setState(next);
    fbId.current += 1;
    setFeedback({ id: fbId.current, fb });
    if (next.finished) void finish();
  }, [dict, finish]);

  const submitWord = useCallback((word: string) => {
    const w = word.trim();
    if (!w) return;
    dispatch({ t: 'attempt', word: w.slice(0, 30), at: elapsed() });
  }, [dispatch]);

  const pass = useCallback(() => dispatch({ t: 'pass', at: elapsed() }), [dispatch]);

  const reset = useCallback(() => {
    setPhase('idle');
    setState(null);
    setResult(null);
    setFeedback(null);
  }, []);

  // Cronómetro de Contrarreloj (tiempo real: no se pausa con los modales).
  useEffect(() => {
    if (phase !== 'playing' || state?.mode !== 'contrarreloj') return;
    const id = window.setInterval(() => {
      const left = CONTRARRELOJ_MS - elapsed();
      setRemainingMs(Math.max(0, left));
      if (left <= 0) void finish();
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, state?.mode, finish]);

  return { phase, state, feedback, remainingMs, result, notice, start, submitWord, pass, reset };
}
