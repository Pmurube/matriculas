import { useEffect, useState } from 'react';
import { ACHIEVEMENTS, type AchievementId } from '../game/achievements.ts';
import { MODE_LABEL, MODES } from '../game/config.ts';
import { fetchMyAchievements } from '../lib/api.ts';
import { readStats } from '../lib/local-store.ts';
import { Modal } from './Modal.tsx';

export function BadgesModal({ onClose, online }: { onClose: () => void; online: boolean }) {
  const stats = readStats();
  const [owned, setOwned] = useState<Partial<Record<AchievementId, number>>>(() =>
    online ? {} : Object.fromEntries(Object.entries(stats.achievements).map(([k, v]) => [k, v!.times])),
  );
  useEffect(() => {
    if (!online) return;
    fetchMyAchievements()
      .then((list) => setOwned(Object.fromEntries(list.map((a) => [a.achievement_id, a.times_won]))))
      .catch(() => undefined);
  }, [online]);
  return (
    <Modal title="Insignias y estadísticas" onClose={onClose} wide>
      <section aria-label="Estadísticas" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Partidas', stats.gamesPlayed],
          ['Resueltas', stats.solvedTotal],
          ['Mejor combo', stats.bestCombo],
          ['Palabra más larga', stats.longestWord ? stats.longestWord.toUpperCase() : '—'],
          ...MODES.map((m) => [`Récord ${MODE_LABEL[m]}`, stats.best[m] ?? '—'] as [string, number | string]),
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-asphalt p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{k}</p>
            <p className="mt-1 truncate text-lg font-black">{v}</p>
          </div>
        ))}
      </section>
      <p className="mb-3 text-xs text-muted">Estadísticas de este dispositivo. {online ? 'Las insignias vienen de tu cuenta.' : 'Modo local: insignias guardadas en este dispositivo.'}</p>
      <ul className="grid gap-2 sm:grid-cols-2" data-testid="badges-list">
        {ACHIEVEMENTS.map((a) => {
          const times = owned[a.id];
          const on = Boolean(times);
          return (
            <li key={a.id} className={`flex items-center gap-3 rounded-xl border p-3 ${on ? 'border-ink bg-white' : 'border-dashed border-ink/20 opacity-70'}`} data-unlocked={on}>
              <span className={`plate-chars grid h-12 min-w-12 place-items-center rounded-lg border-2 px-1 text-sm ${on ? 'border-ink bg-plate' : 'border-ink/20'}`} aria-hidden>{a.icon}</span>
              <span className="flex-1">
                <span className="block text-sm font-black">{a.name}{a.kind === 'competitive' ? ' 🏆' : ''}</span>
                <span className="block text-xs text-muted">{a.description}</span>
              </span>
              <span className="text-xs font-bold">{on ? (times! > 1 ? `×${times}` : 'Conseguida') : 'Bloqueada'}</span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
