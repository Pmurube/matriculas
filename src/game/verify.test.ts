import { describe, expect, it } from 'vitest';
import { buildDictionary } from './dictionary.ts';
import { verifySubmission, type VerifyInput } from './verify.ts';

const dict = buildDictionary(['barco', 'barca', 'abarca']);
const base = (over: Partial<VerifyInput>): VerifyInput => ({
  mode: 'contrarreloj',
  plates: Array(80).fill({ pattern: 'brc' }),
  events: [],
  startedAtMs: 1_000_000,
  nowMs: 1_000_000 + 121_000,
  dict,
  rareConfig: {},
  ...over,
});
const solves = (n: number, gap = 2000) => Array.from({ length: n }, (_, i) => ({ t: 'attempt', word: 'barco', at: (i + 1) * gap }));

describe('verificación en servidor', () => {
  it('recalcula la puntuación desde los eventos', () => {
    const r = verifySubmission(base({ events: solves(3) }));
    expect(r.ok && r.summary.score).toBe(3 + 4 + 5);
  });
  it('rechaza palabras inventadas sin puntuarlas (cuentan como fallo)', () => {
    const r = verifySubmission(base({ events: [{ t: 'attempt', word: 'brc', at: 2000 }] }));
    expect(r.ok && r.summary.score).toBe(0);
  });
  it.each([
    ['eventos no array', { events: 'x' }, 'eventos_no_validos'],
    ['tiempos no monótonos', { events: [{ t: 'pass', at: 5000 }, { t: 'pass', at: 1000 }] }, 'tiempos_no_monotonos'],
    ['tipo desconocido', { events: [{ t: 'score', at: 1 }] }, 'tipo_evento_desconocido'],
    ['palabra larguísima', { events: [{ t: 'attempt', word: 'a'.repeat(50), at: 1 }] }, 'palabra_no_valida'],
    ['tiempo cliente mayor que el del servidor', { nowMs: 1_000_000 + 10_000, events: solves(3, 5000) }, 'tiempo_cliente_imposible'],
    ['envío tardío', { nowMs: 1_000_000 + 200_000 }, 'envio_fuera_de_plazo'],
    ['eventos tras 120 s', { events: [{ t: 'pass', at: 120_000 }] }, 'eventos_fuera_de_tiempo'],
    ['ritmo sobrehumano', { events: solves(40, 300) }, 'ritmo_imposible'],
    ['demasiados eventos', { events: Array(601).fill({ t: 'pass', at: 1 }) }, 'demasiados_eventos'],
  ])('%s', (_n, over, reason) => {
    expect(verifySubmission(base(over as Partial<VerifyInput>))).toEqual({ ok: false, reason });
  });
  it('clásico debe estar completo y no admite eventos tras el fin', () => {
    const plates = Array(10).fill({ pattern: 'brc' });
    expect(verifySubmission(base({ mode: 'clasico', plates, events: solves(9) }))).toEqual({ ok: false, reason: 'partida_incompleta' });
    expect(verifySubmission(base({ mode: 'clasico', plates, events: solves(11) }))).toEqual({ ok: false, reason: 'eventos_tras_fin' });
    const ok = verifySubmission(base({ mode: 'clasico', plates, events: solves(10) }));
    expect(ok.ok && ok.summary.solved).toBe(10);
  });
});
