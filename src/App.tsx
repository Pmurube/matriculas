import { useEffect, useState } from 'react';
import { MODE_LABEL, type GameMode } from './game/config.ts';
import type { Dictionary } from './game/dictionary.ts';
import { AccountModal } from './components/AccountModal.tsx';
import { AnswerForm } from './components/AnswerForm.tsx';
import { BadgesModal } from './components/BadgesModal.tsx';
import { FeedbackBar } from './components/FeedbackBar.tsx';
import { GameHud } from './components/GameHud.tsx';
import { Header, type Overlay } from './components/Header.tsx';
import { HowToPlayModal } from './components/HowToPlayModal.tsx';
import { LeaderboardModal } from './components/LeaderboardModal.tsx';
import { ModeSelector } from './components/ModeSelector.tsx';
import { ConsonantHint, Plate } from './components/Plate.tsx';
import { ResultPanel } from './components/ResultPanel.tsx';
import { StatCards } from './components/StatCards.tsx';
import { useAccount } from './hooks/useAccount.ts';
import { useGame } from './hooks/useGame.ts';
import { fetchMyBest } from './lib/api.ts';
import { loadDictionary } from './lib/dictionary-loader.ts';
import { ONLINE } from './lib/env.ts';
import { readStats } from './lib/local-store.ts';

/** SPA de una sola pantalla (SPEC §6): todos los estados conviven aquí, sin rutas ni recargas. */
export default function App() {
  const [dict, setDict] = useState<Dictionary | null>(null);
  const [dictError, setDictError] = useState(false);
  const [mode, setMode] = useState<GameMode>('contrarreloj');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [best, setBest] = useState<number | null>(null);
  const { account, updateAlias, linkEmail, signOut } = useAccount();
  const online = ONLINE && account.status === 'ready';
  const game = useGame(dict, online);

  useEffect(() => {
    loadDictionary().then(setDict).catch(() => setDictError(true));
  }, []);

  useEffect(() => {
    if (game.phase !== 'idle' && game.phase !== 'result') return;
    const local = readStats().best[mode] ?? null;
    if (!online) {
      setBest(local);
      return;
    }
    fetchMyBest(mode).then((b) => setBest(b ?? local)).catch(() => setBest(local));
  }, [mode, online, game.phase]);

  const playing = game.phase === 'playing' || game.phase === 'submitting';
  const st = game.state;
  const plate = st && !st.finished ? st.plates[st.index] : null;
  const fb = game.feedback?.fb;
  const pulse = game.feedback && (fb?.kind === 'correct' ? { kind: 'pop' as const, id: game.feedback.id } : fb?.kind === 'wrong' ? { kind: 'shake' as const, id: game.feedback.id } : null);

  const start = () => void game.start(mode);

  return (
    <div className="mx-auto min-h-dvh max-w-4xl sm:px-4 sm:py-6">
      <div className="min-h-dvh bg-white sm:min-h-0 sm:rounded-3xl sm:border sm:border-ink/10 sm:shadow-[0_20px_60px_-30px_#0004]">
        <Header open={setOverlay} />
        <main className="space-y-5 px-4 py-5 sm:px-8 sm:py-7">
          {dictError && <p role="alert" className="rounded-xl bg-warn-soft p-4 text-sm text-warn">No se pudo cargar el diccionario. Recarga la página.</p>}
          {game.notice && <p role="status" className="rounded-xl bg-asphalt p-3 text-sm">{game.notice}</p>}

          {(game.phase === 'idle' || game.phase === 'starting') && (
            <section aria-label="Inicio" className="space-y-5">
              <ModeSelector value={mode} onChange={setMode} disabled={game.phase === 'starting'} />
              <Plate score={0} pattern="brc" label="Matrícula de ejemplo 0000 BRC" />
              <p className="text-center text-sm text-muted">Las letras son el reto. Los números, tu puntuación. Añade vocales y forma palabras.</p>
              <button type="button" className="btn-primary w-full text-lg" onClick={start} disabled={!dict || game.phase === 'starting'} data-testid="start">
                {game.phase === 'starting' ? 'Preparando…' : `Arrancar · ${MODE_LABEL[mode]}`}
              </button>
              <StatCards score={0} best={best} onRanking={() => setOverlay('ranking')} rankingAvailable={online} />
            </section>
          )}

          {playing && st && (
            <section aria-label={`Partida ${MODE_LABEL[st.mode]}`} className="space-y-4" data-testid="game">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted">{MODE_LABEL[st.mode]}</p>
                <button type="button" className="text-xs font-bold text-muted underline" onClick={game.reset} disabled={game.phase === 'submitting'}>Salir</button>
              </div>
              <GameHud state={st} remainingMs={game.remainingMs} />
              <Plate score={st.score} pattern={plate?.pattern ?? 'fin'} pulse={pulse} />
              {plate && <ConsonantHint pattern={plate.pattern} />}
              <AnswerForm onSubmit={game.submitWord} onPass={game.pass} disabled={game.phase !== 'playing'} resetKey={st.index} />
              {game.phase === 'submitting' ? <p role="status" className="text-center text-sm font-bold">Validando partida…</p> : <FeedbackBar feedback={game.feedback} mode={st.mode} />}
              <StatCards score={st.score} best={best} onRanking={() => setOverlay('ranking')} rankingAvailable={online} />
            </section>
          )}

          {game.phase === 'result' && game.result && st && (
            <>
              <Plate score={game.result.score} pattern="fin" label={`Resultado final: ${game.result.score} puntos`} />
              <ResultPanel result={game.result} state={st} onReplay={start} onChangeMode={game.reset} />
            </>
          )}
        </main>
        <footer className="px-4 pb-6 sm:px-8">
          <div className="road-dash" aria-hidden />
          <p className="mt-3 text-center text-[11px] text-muted">{ONLINE ? (online ? `Jugando como ${account.alias || '…'}` : 'Conectando…') : 'Modo local · sin ranking'}</p>
        </footer>
      </div>

      {overlay === 'howto' && <HowToPlayModal onClose={() => setOverlay(null)} />}
      {overlay === 'ranking' && <LeaderboardModal onClose={() => setOverlay(null)} online={online} />}
      {overlay === 'badges' && <BadgesModal onClose={() => setOverlay(null)} online={online} />}
      {overlay === 'account' && <AccountModal onClose={() => setOverlay(null)} account={account} updateAlias={updateAlias} linkEmail={linkEmail} signOut={signOut} />}
    </div>
  );
}
