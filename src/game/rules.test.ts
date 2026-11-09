import { describe, expect, it } from 'vitest';
import { realDictionary } from '../../tests/helpers.ts';
import { checkAnswer } from './rules.ts';

const dict = realDictionary();

describe('reglas con el diccionario real (BRC)', () => {
  it.each(['barco', 'BARCA', 'abarca', 'Bárico', 'barico'])('%s es válida', (w) => {
    expect(checkAnswer(w, 'brc', dict).ok).toBe(true);
  });
  it('BARRACA no: repite R', () => {
    expect(checkAnswer('barraca', 'brc', dict)).toMatchObject({ ok: false, reason: 'num_consonantes' });
  });
  it('BARRANCO no: añade N', () => {
    expect(checkAnswer('barranco', 'brc', dict)).toMatchObject({ ok: false, reason: 'num_consonantes' });
  });
  it('ABARCO no: verbo conjugado, no está en el diccionario', () => {
    expect(checkAnswer('abarco', 'brc', dict)).toMatchObject({ ok: false, reason: 'no_existe' });
  });
  it('ABARCAR no está en el archivo adjunto', () => {
    expect(checkAnswer('abarcar', 'brc', dict).ok).toBe(false);
  });
  it('rechaza orden distinto, sustituciones y símbolos', () => {
    expect(checkAnswer('cobra', 'brc', dict)).toMatchObject({ ok: false, reason: 'consonantes' });
    expect(checkAnswer('barro', 'brc', dict).ok).toBe(false);
    expect(checkAnswer('bar co', 'brc', dict)).toMatchObject({ ok: false, reason: 'caracteres' });
    expect(checkAnswer('', 'brc', dict)).toMatchObject({ ok: false, reason: 'vacia' });
  });
  it('no admite nombres propios ni siglas del archivo', () => {
    expect(dict.lookup('Toledo')).toBe(null);
    expect(dict.lookup('gps')).toBe(null);
    expect(dict.lookup('ampère')).toBe(null);
  });
});
