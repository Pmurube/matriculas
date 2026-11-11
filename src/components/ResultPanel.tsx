import { ACHIEVEMENTS } from '../game/achievements.ts';
import { MODE_LABEL } from '../game/config.ts';
import type { GameState } from '../game/engine.ts';
import { plateLetters } from '../game/normalize.ts';
import type { GameResult } from '../hooks/useGame.ts';
import { BadgeArt } from './BadgeArt.tsx';

const PERIOD_LABEL = { daily: 'hoy', monthly: 'este mes', alltime: 'histórico' } as const;

export function ResultPanel({ result, state, onReplay, onChangeMode }: { result: GameResult; state: GameState; onReplay: () => void; onChangeMode: () => void }) {
  const s = result.summary;
  const solved = state.rounds.filter((r) => r.outcome === 'solved');
  const passed = state.rounds.filter((r) => r.outcome === 'passed');
  const ach = ACHIEVEMENTS.filter((a) => result.newAchievements.includes(a.id));
  return (
    <section aria-labelledby="result-title" className="animate-rise space-y-4" data-testid="result">
      <h2 id="result-title" className="text-center text-sm font-black uppercase tracking-widest text-muted">
        Fin del trayecto · {MODE_LABEL[result.mode]}
      </h2>
      {result.note && <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn" role="alert">{result.note}</p>}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Puntuación final', String(result.score)],
          ['Resueltas', String(s.solved)],
          ['Pasadas', String(s.passed)],
          ['Mejor combo', String(s.bestCombo)],
        ].map(([k, v]) => (
          <div key={k} className="card p-3">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted">{k}</dt>
            <dd className="plate-chars mt-1 text-3xl" data-testid={`result-${k}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="card p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Mejor palabra</p>
        <p className="mt-1 text-xl font-black uppercase">{s.bestWord ? `${s.bestWord.word} · +${s.bestWord.points}` : '—'}</p>
      </div>
      {result.ranks.length > 0 && (
        <div className="card flex flex-wrap gap-3 p-4" data-testid="result-ranks">
          {result.ranks.map((r) => (
            <span key={r.period_type} className="chip bg-road-soft text-road">#{r.position} {PERIOD_LABEL[r.period_type]}</span>
          ))}
        </div>
      )}
      {ach.length > 0 && (
        <div className="card p-4" data-testid="result-badges">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">Insignias desbloqueadas</p>
          <ul className="flex flex-wrap gap-4">
            {ach.map((a) => (
              <li key={a.id} className="animate-pop flex w-20 flex-col items-center gap-1 text-center">
                <BadgeArt id={a.id} className="h-16 w-16" />
                <span className="text-xs font-bold leading-tight">{a.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <details className="card p-4 text-sm">
        <summary className="font-bold">Matrículas ({solved.length} resueltas · {passed.length} pasadas)</summary>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {state.rounds.map((r) => (
            <li key={r.index} className="flex justify-between gap-2 border-b border-ink/5 py-1">
              <span className="plate-chars text-lg">{plateLetters(r.pattern)}</span>
              <span className={r.outcome === 'solved' ? 'font-bold uppercase' : 'text-muted'}>{r.outcome === 'solved' ? `${r.word} +${r.breakdown?.total}` : 'pasada'}</span>
            </li>
          ))}
        </ul>
      </details>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-primary" onClick={onReplay} data-testid="replay">Volver a jugar</button>
        <button type="button" className="btn-secondary" onClick={onChangeMode}>Cambiar modo</button>
      </div>
    </section>
  );
}
