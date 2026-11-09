import { useEffect, useState } from 'react';
import type { GameMode } from '../game/config.ts';
import { fetchLeaderboard, type LeaderRow, type PeriodType } from '../lib/api.ts';
import { Modal } from './Modal.tsx';

const TABS: { mode: GameMode; period: PeriodType; label: string }[] = [
  { mode: 'contrarreloj', period: 'daily', label: 'Contrarreloj · Hoy' },
  { mode: 'contrarreloj', period: 'monthly', label: 'Contrarreloj · Mes' },
  { mode: 'clasico', period: 'daily', label: 'Clásico · Hoy' },
  { mode: 'clasico', period: 'alltime', label: 'Clásico · Histórico' },
];

export function LeaderboardModal({ onClose, online }: { onClose: () => void; online: boolean }) {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<{ rows: LeaderRow[]; me: { position: number; score: number } | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!online) return;
    let alive = true;
    setData(null);
    setError(null);
    fetchLeaderboard(TABS[tab].mode, TABS[tab].period)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError('No se pudo cargar el ranking.'));
    return () => {
      alive = false;
    };
  }, [tab, online]);

  return (
    <Modal title="Ranking" onClose={onClose}>
      {!online ? (
        <p className="rounded-xl bg-asphalt p-4 text-sm" data-testid="ranking-offline">El ranking necesita conexión con el servidor. Esta instalación funciona en modo local (sin Supabase configurado).</p>
      ) : (
        <>
          <div role="tablist" aria-label="Clasificación" className="mb-4 grid grid-cols-2 gap-2">
            {TABS.map((t, i) => (
              <button key={t.label} role="tab" aria-selected={tab === i} type="button" onClick={() => setTab(i)} className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase ${tab === i ? 'border-ink bg-ink text-white' : 'border-ink/15'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            {error && <p className="text-sm text-warn">{error}</p>}
            {!data && !error && <p className="text-sm text-muted">Cargando…</p>}
            {data && data.rows.length === 0 && <p className="text-sm text-muted">Aún no hay puntuaciones en este periodo.</p>}
            {data && data.rows.length > 0 && (
              <ol className="divide-y divide-ink/5">
                {data.rows.map((r) => (
                  <li key={r.position} className="flex items-center gap-3 py-2">
                    <span className="plate-chars w-8 text-xl text-muted">{r.position}</span>
                    <span className="flex-1 truncate font-bold">{r.alias}</span>
                    <span className="plate-chars text-2xl">{String(r.score).padStart(4, '0')}</span>
                  </li>
                ))}
              </ol>
            )}
            {data?.me && <p className="mt-4 rounded-xl bg-road-soft p-3 text-sm font-bold text-road">Tu posición: #{data.me.position} · {data.me.score} puntos</p>}
          </div>
        </>
      )}
    </Modal>
  );
}
