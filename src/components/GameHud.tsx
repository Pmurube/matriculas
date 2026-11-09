import { getChallenge } from '../game/challenges.ts';
import type { GameState } from '../game/engine.ts';
import { IconFlame, IconTimer } from './Icons.tsx';

function mmss(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function GameHud({ state, remainingMs }: { state: GameState; remainingMs: number }) {
  const plate = state.plates[state.index];
  const challenge = getChallenge(plate?.challenge);
  const low = remainingMs <= 15_000;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {state.mode === 'contrarreloj' ? (
        <>
          <span role="timer" aria-label={`Tiempo restante ${mmss(remainingMs)}`} data-testid="timer" className={`chip text-xl tabular-nums ${low ? 'bg-warn-soft text-warn' : 'bg-road-soft text-road'}`}>
            <IconTimer /> {mmss(remainingMs)}
          </span>
          <span className="chip bg-combo-soft text-combo" data-testid="combo" aria-label={`Combo ${state.streak}`}>
            <IconFlame /> COMBO <span className="text-lg">× {state.streak}</span>
          </span>
        </>
      ) : (
        <span className="chip bg-white text-ink ring-1 ring-ink/10" data-testid="progress" aria-label={`Matrícula ${Math.min(state.index + 1, state.plates.length)} de ${state.plates.length}`}>
          {Math.min(state.index + 1, state.plates.length)}/{state.plates.length}
        </span>
      )}
      {challenge && (
        <span className="chip bg-combo text-white" data-testid="challenge">
          Reto +3: {challenge.label}
        </span>
      )}
    </div>
  );
}
