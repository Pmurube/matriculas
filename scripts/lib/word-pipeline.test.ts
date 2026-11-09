import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rtfToLines } from './rtf.ts';
import { classifyRows, rowsToCsv, rowsToSql, summarizeRows } from './word-pipeline.ts';

describe('clasificación de filas', () => {
  const rows = classifyRows(
    ['barco', 'Toledo', 'GPS', 'da capo', '‒́ptera', 'ampère', 'abrepuño', 'barco', '', 'antes', 'alquilé', 'BARCA', 'árbol'],
    { blocklist: new Set(['árbol']) },
  );
  const by = (i: number) => rows[i];
  it('acepta palabras válidas y extrae el patrón', () => {
    expect(by(0)).toMatchObject({ status: 'accepted', pattern: 'brc', plainKey: 'barco', letters: 5, row: 1 });
  });
  it.each([
    [1, 'nombre_propio'],
    [2, 'abreviatura'],
    [3, 'multipalabra'],
    [4, 'afijo'],
    [5, 'caracteres_no_validos'],
    [6, 'consonantes_distintas_de_3'],
    [7, 'duplicado'],
    [8, 'fila_vacia'],
    [11, 'abreviatura'],
    [12, 'bloqueada_manual'],
  ])('fila %i rechazada por %s', (i, reason) => {
    expect(by(i)).toMatchObject({ status: 'rejected', reason });
  });
  it('marca avisos sin rechazar (salvo --strict)', () => {
    expect(by(9)).toMatchObject({ status: 'accepted', flags: ['posible_plural'] });
    expect(by(10)).toMatchObject({ status: 'accepted', flags: ['posible_forma_verbal'] });
    const strict = classifyRows(['antes'], { strict: true });
    expect(strict[0]).toMatchObject({ status: 'rejected', reason: 'marcada_revision_estricta' });
    const allowed = classifyRows(['antes'], { allowlist: new Set(['antes']) });
    expect(allowed[0].flags).toEqual([]);
  });
  it('no descarta nada en silencio: cada fila tiene estado y el resumen cuadra', () => {
    const s = summarizeRows(rows);
    expect(s.totalRows).toBe(13);
    expect(s.accepted + s.rejected).toBe(13);
    expect(rowsToCsv(rows).trim().split('\n')).toHaveLength(14);
  });
  it('genera SQL idempotente', () => {
    const sql = rowsToSql(rows, 'test.rtf');
    expect(sql).toContain('on conflict (word) do update');
    expect(sql).toContain('refresh_consonant_patterns');
    expect(sql).toContain("'barco'");
    expect(sql).not.toContain("'Toledo'");
  });
});

describe('archivo real Palabras.rtf', () => {
  const text = readFileSync(resolve(import.meta.dirname, '../../data/source/Palabras.rtf'), 'latin1');
  const rows = classifyRows(rtfToLines(text));
  const s = summarizeRows(rows);
  it('procesa todas las filas', () => {
    expect(s.totalRows).toBe(16677);
    expect(s.accepted + s.rejected).toBe(s.totalRows);
    expect(rows.every((r) => r.status === 'accepted' || r.reason)).toBe(true);
  });
  it('contiene los ejemplos del brief que existen en el archivo', () => {
    const accepted = new Set(rows.filter((r) => r.status === 'accepted').map((r) => r.normalized));
    expect(accepted.has('barco') && accepted.has('barca') && accepted.has('abarca')).toBe(true);
    expect(accepted.has('abarcar')).toBe(false);
    expect(accepted.has('abarco')).toBe(false);
  });
  it('todas las aceptadas tienen exactamente 3 consonantes', () => {
    expect(rows.filter((r) => r.status === 'accepted').every((r) => r.pattern?.length === 3)).toBe(true);
  });
});
