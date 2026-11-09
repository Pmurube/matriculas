import {
  consonantPattern,
  consonantsOf,
  hasOnlySpanishLetters,
  letterCount,
  normalizeWord,
  plainKey,
} from '../../src/game/normalize.ts';

/**
 * Clasificación fila a fila del listado de palabras (SPEC §13).
 * Ninguna fila se descarta en silencio: cada una termina como `accepted` o `rejected`
 * con un motivo explícito, y las aceptadas pueden llevar avisos (`flags`) para revisión.
 */

export type RejectCode =
  | 'fila_vacia'
  | 'multipalabra'
  | 'afijo'
  | 'caracteres_no_validos'
  | 'abreviatura'
  | 'nombre_propio'
  | 'consonantes_distintas_de_3'
  | 'duplicado'
  | 'bloqueada_manual'
  | 'marcada_revision_estricta';

export type FlagCode = 'posible_plural' | 'posible_forma_verbal';

export const REJECT_LABEL: Record<RejectCode, string> = {
  fila_vacia: 'Fila vacía',
  multipalabra: 'Contiene espacios (locución de varias palabras)',
  afijo: 'Afijo o entrada que empieza por guion',
  caracteres_no_validos: 'Contiene caracteres que no son letras españolas',
  abreviatura: 'Sigla o abreviatura (todo en mayúsculas)',
  nombre_propio: 'Nombre propio (empieza por mayúscula)',
  consonantes_distintas_de_3: 'No tiene exactamente 3 consonantes',
  duplicado: 'Duplicado de una fila anterior',
  bloqueada_manual: 'Bloqueada en data/blocklist.txt',
  marcada_revision_estricta: 'Marcada para revisión y excluida con --strict',
};

export const FLAG_LABEL: Record<FlagCode, string> = {
  posible_plural: 'Termina en vocal + s: revisar si es plural',
  posible_forma_verbal: 'Termina en vocal tónica é/ó: revisar si es verbo conjugado',
};

export interface RowResult {
  row: number;
  raw: string;
  normalized: string;
  status: 'accepted' | 'rejected';
  reason?: RejectCode;
  detail?: string;
  flags: FlagCode[];
  pattern?: string;
  plainKey?: string;
  letters?: number;
}

export interface PipelineOptions {
  blocklist?: Set<string>;
  /** Palabras revisadas manualmente: se les quitan los avisos. */
  allowlist?: Set<string>;
  /** Si true, las filas con avisos se rechazan en lugar de aceptarse. */
  strict?: boolean;
}

const DASHES = /^[-‐‑‒–—―]/;

export function classifyRows(lines: string[], opts: PipelineOptions = {}): RowResult[] {
  const seen = new Map<string, number>();
  const results: RowResult[] = [];
  lines.forEach((raw, idx) => {
    const row = idx + 1;
    const trimmed = raw.normalize('NFC').trim();
    const normalized = normalizeWord(trimmed);
    const base: RowResult = { row, raw, normalized, status: 'rejected', flags: [] };
    const reject = (reason: RejectCode, detail?: string) => results.push({ ...base, reason, detail });

    if (trimmed.length === 0) return reject('fila_vacia');
    if (/\s/.test(trimmed)) return reject('multipalabra');
    if (DASHES.test(trimmed)) return reject('afijo');
    if (!hasOnlySpanishLetters(trimmed)) {
      const bad = Array.from(normalized).filter((c) => !hasOnlySpanishLetters(c));
      return reject('caracteres_no_validos', `Caracteres: ${bad.map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`).join(' ')}`);
    }
    const chars = Array.from(trimmed);
    if (chars.length >= 2 && chars.every((c) => c === c.toLocaleUpperCase('es-ES'))) return reject('abreviatura');
    if (chars[0] !== chars[0].toLocaleLowerCase('es-ES')) return reject('nombre_propio');
    const nCons = consonantsOf(normalized).length;
    if (nCons !== 3) return reject('consonantes_distintas_de_3', `Tiene ${nCons}: ${consonantPattern(normalized).toUpperCase()}`);
    const first = seen.get(normalized);
    if (first !== undefined) return reject('duplicado', `Igual que la fila ${first}`);
    seen.set(normalized, row);
    if (opts.blocklist?.has(normalized)) return reject('bloqueada_manual');

    const flags: FlagCode[] = [];
    if (!opts.allowlist?.has(normalized)) {
      if (/[aeiouáéíóú]s$/.test(normalized) && chars.length > 4) flags.push('posible_plural');
      if (/[éó]$/.test(normalized)) flags.push('posible_forma_verbal');
    }
    if (opts.strict && flags.length > 0) {
      results.push({ ...base, flags, reason: 'marcada_revision_estricta' });
      return;
    }

    results.push({
      ...base,
      status: 'accepted',
      flags,
      pattern: consonantPattern(normalized),
      plainKey: plainKey(normalized),
      letters: letterCount(normalized),
    });
  });
  return results;
}

export interface PipelineSummary {
  totalRows: number;
  accepted: number;
  rejected: number;
  flagged: number;
  byReason: Partial<Record<RejectCode, number>>;
  byFlag: Partial<Record<FlagCode, number>>;
  patterns: number;
}

export function summarizeRows(rows: RowResult[]): PipelineSummary {
  const byReason: PipelineSummary['byReason'] = {};
  const byFlag: PipelineSummary['byFlag'] = {};
  const patterns = new Set<string>();
  let accepted = 0;
  let flagged = 0;
  for (const r of rows) {
    if (r.status === 'accepted') {
      accepted += 1;
      if (r.pattern) patterns.add(r.pattern);
    } else if (r.reason) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
    if (r.flags.length) flagged += 1;
    for (const f of r.flags) byFlag[f] = (byFlag[f] ?? 0) + 1;
  }
  return { totalRows: rows.length, accepted, rejected: rows.length - accepted, flagged, byReason, byFlag, patterns: patterns.size };
}

export function parseListFile(text: string): Set<string> {
  return new Set(
    text
      .split(/\r?\n/)
      .map((l) => l.replace(/#.*/, '').trim())
      .filter(Boolean)
      .map((l) => normalizeWord(l)),
  );
}

function csvCell(v: string | number | undefined): string {
  const s = v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rowsToCsv(rows: RowResult[]): string {
  const head = 'fila,original,normalizada,estado,motivo,detalle,avisos,patron,letras';
  const body = rows.map((r) =>
    [r.row, r.raw, r.normalized, r.status === 'accepted' ? 'aceptada' : 'rechazada', r.reason ? REJECT_LABEL[r.reason] : '', r.detail, r.flags.join('|'), r.pattern?.toUpperCase(), r.letters]
      .map(csvCell)
      .join(','),
  );
  return [head, ...body].join('\n') + '\n';
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/** SQL idempotente: upsert por palabra y desactivación de palabras que ya no están en el archivo. */
export function rowsToSql(rows: RowResult[], sourceName: string): string {
  const accepted = rows.filter((r) => r.status === 'accepted');
  const chunks: string[] = [];
  for (let i = 0; i < accepted.length; i += 500) {
    const values = accepted
      .slice(i, i + 500)
      .map((r) => `(${sqlString(r.normalized)},${sqlString(r.plainKey!)},${sqlString(r.pattern!)},${r.letters},${r.row},${r.flags.length ? `array[${r.flags.map(sqlString).join(',')}]::text[]` : "'{}'::text[]"})`)
      .join(',\n');
    chunks.push(`insert into public.words (word, plain_key, pattern, letters, source_row, flags)\nvalues\n${values}\non conflict (word) do update set plain_key = excluded.plain_key, pattern = excluded.pattern, letters = excluded.letters, source_row = excluded.source_row, flags = excluded.flags, status = 'active', updated_at = now();`);
  }
  return [
    `-- Generado por scripts/import-words.ts desde ${sourceName}. No editar a mano.`,
    `-- Idempotente: puede ejecutarse varias veces.`,
    'begin;',
    'create temporary table _import_words (word text primary key) on commit drop;',
    ...chunks,
    ...chunk(accepted, 1000).map((part) => `insert into _import_words (word) values ${part.map((r) => `(${sqlString(r.normalized)})`).join(',')};`),
    `update public.words set status = 'blocked', updated_at = now() where status = 'active' and word not in (select word from _import_words);`,
    'select public.refresh_consonant_patterns();',
    'commit;',
    '',
  ].join('\n');
}
