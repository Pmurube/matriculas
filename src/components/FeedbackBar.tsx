import type { ReactNode } from 'react';
import type { Feedback } from '../game/engine.ts';
import { IconCheck, IconSkip, IconX } from './Icons.tsx';

export function FeedbackBar({ feedback, mode }: { feedback: { id: number; fb: Feedback } | null; mode: string }) {
  const fb = feedback?.fb;
  let body: ReactNode = <span className="text-muted">Escribe una palabra con esas consonantes y pulsa VALIDAR.</span>;
  let tone = 'border-ink/10 bg-white';
  if (fb?.kind === 'correct') {
    const b = fb.round.breakdown!;
    tone = 'border-road/30 bg-road-soft';
    body = (
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 font-black text-road"><IconCheck />¡Correcto!</span>
        <span className="font-bold">+{b.total} puntos</span>
        <span>Palabra: <b className="uppercase">{fb.round.word}</b></span>
        <span className="text-xs text-muted">vocales {b.vowels} · longitud {b.length}{b.rare ? ` · rareza ${b.rare}` : ''}{mode === 'contrarreloj' ? ` · combo ${b.combo}` : ''}{fb.round.challenge ? ` · reto ${b.challenge}` : ''}</span>
      </span>
    );
  } else if (fb?.kind === 'wrong') {
    tone = 'border-warn/30 bg-warn-soft';
    body = <span className="flex items-center gap-1.5"><span className="flex items-center gap-1.5 font-black text-warn"><IconX />No vale.</span> {fb.message}{mode === 'contrarreloj' ? ' Combo a cero.' : ''}</span>;
  } else if (fb?.kind === 'passed') {
    body = <span className="flex items-center gap-1.5 font-bold"><IconSkip />Matrícula pasada.{mode === 'contrarreloj' ? ' Combo a cero.' : ''}</span>;
  }
  return (
    <div role="status" aria-live="polite" data-testid="feedback" data-kind={fb?.kind ?? 'idle'} key={feedback?.id ?? 0} className={`animate-rise min-h-14 rounded-xl border px-4 py-3 text-sm ${tone}`}>
      {body}
    </div>
  );
}
