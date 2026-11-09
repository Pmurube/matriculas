import { formatScore } from '../game/normalize.ts';
import { IconTrophy } from './Icons.tsx';

export function StatCards({ score, best, onRanking, rankingAvailable }: { score: number; best: number | null; onRanking: () => void; rankingAvailable: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="card p-3 sm:p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Puntuación</p>
        <p className="plate-chars mt-1 text-3xl text-road sm:text-4xl" data-testid="score">{formatScore(score)}</p>
      </div>
      <div className="card p-3 sm:p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Tu mejor</p>
        <p className="plate-chars mt-1 text-3xl sm:text-4xl">{best === null ? '—' : formatScore(best)}</p>
      </div>
      <button type="button" onClick={onRanking} className="card flex flex-col items-start p-3 text-left hover:border-ink/30 sm:p-4">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted"><IconTrophy className="h-3.5 w-3.5" />Ranking</span>
        <span className="mt-1 text-sm font-bold">{rankingAvailable ? 'Ver clasificación' : 'Solo online'}</span>
      </button>
    </div>
  );
}
