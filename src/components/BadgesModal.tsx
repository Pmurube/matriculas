import { useEffect, useState } from 'react';
import { ACHIEVEMENTS, type AchievementId } from '../game/achievements.ts';
import { MODE_LABEL, MODES } from '../game/config.ts';
import { fetchMyAchievements } from '../lib/api.ts';
import { readStats } from '../lib/local-store.ts';
import { BadgeArt } from './BadgeArt.tsx';
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
  const progress = ACHIEVEMENTS.filter((a) => a.kind === 'progress');
  const competitive = ACHIEVEMENTS.filter((a) => a.kind === 'competitive');
  const renderList = (list: typeof ACHIEVEMENTS) => (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="badges-list" data-kind={list[0]?.kind}>
      {list.map((a) => {
        const times = owned[a.id];
        const on = Boolean(times);
        return (
          <li
            key={a.id}
            className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center ${on ? 'border-ink/15 bg-white' : 'border-dashed border-ink/20 bg-asphalt/40'}`}
            data-unlocked={on}
          >
            <BadgeArt id={a.id} locked={!on} className="h-16 w-16" />
            <span className="text-sm font-black leading-tight">{a.name}</span>
            <span className="text-xs leading-snug text-muted">{a.description}</span>
            <span className={`mt-auto text-[11px] font-bold uppercase tracking-wide ${on ? 'text-road' : 'text-muted'}`}>
              {on ? (times! > 1 ? `Conseguida ×${times}` : 'Conseguida') : 'Bloqueada'}
            </span>
          </li>
        );
      })}
    </ul>
  );
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
      <h3 className="mb-2 text-xs font-black uppercase tracking-widest">Insignias</h3>
      {renderList(progress)}
      <h3 className="mb-2 mt-5 text-xs font-black uppercase tracking-widest">Campeones</h3>
      {renderList(competitive)}
    </Modal>
  );
}
