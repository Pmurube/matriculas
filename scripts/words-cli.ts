/**
 * CLI de palabras (SPEC §13). Ejecutar con Node ≥ 22.6 (TypeScript nativo):
 *
 *   node scripts/words-cli.ts validate [--source ruta] [--strict]   # valida + informe, no escribe datos
 *   node scripts/words-cli.ts clean    [--source ruta] [--strict]   # + data/clean/words.csv y public/data/dictionary.json
 *   node scripts/words-cli.ts import   [--source ruta] [--strict]   # dry run por defecto (no toca la BD)
 *   node scripts/words-cli.ts import --write-sql                    # genera supabase/seed/words.sql (idempotente)
 *   node scripts/words-cli.ts import --push                         # sube a Supabase vía RPC (requiere service role)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rtfToLines } from './lib/rtf.ts';
import {
  FLAG_LABEL,
  REJECT_LABEL,
  classifyRows,
  parseListFile,
  rowsToCsv,
  rowsToSql,
  summarizeRows,
  type RowResult,
} from './lib/word-pipeline.ts';
import type { DictionaryFile } from '../src/game/dictionary.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const command = args[0] ?? 'validate';
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

function write(rel: string, content: string) {
  const p = resolve(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  console.log(`  ✓ ${rel}`);
}

function readSource(path: string): string[] {
  const buf = readFileSync(path);
  if (path.toLowerCase().endsWith('.rtf')) return rtfToLines(buf.toString('latin1'));
  return buf.toString('utf8').split(/\r?\n/); // .txt/.csv de una columna
}

function loadRows(): { rows: RowResult[]; source: string } {
  const source = resolve(ROOT, option('source', 'data/source/Palabras.rtf'));
  if (!existsSync(source)) throw new Error(`No existe el archivo de origen: ${source}`);
  const list = (f: string) => (existsSync(resolve(ROOT, f)) ? parseListFile(readFileSync(resolve(ROOT, f), 'utf8')) : new Set<string>());
  const rows = classifyRows(readSource(source), {
    blocklist: list('data/blocklist.txt'),
    allowlist: list('data/allowlist.txt'),
    strict: flag('strict'),
  });
  return { rows, source };
}

function report(rows: RowResult[], source: string) {
  const summary = summarizeRows(rows);
  console.log(`\nArchivo: ${basename(source)}`);
  console.log(`Filas: ${summary.totalRows} · Aceptadas: ${summary.accepted} · Rechazadas: ${summary.rejected} · Con avisos: ${summary.flagged} · Matrículas jugables: ${summary.patterns}`);
  for (const [k, v] of Object.entries(summary.byReason)) console.log(`  ✗ ${REJECT_LABEL[k as keyof typeof REJECT_LABEL]}: ${v}`);
  for (const [k, v] of Object.entries(summary.byFlag)) console.log(`  ⚠ ${FLAG_LABEL[k as keyof typeof FLAG_LABEL]}: ${v}`);
  write('data/reports/import-report.csv', rowsToCsv(rows));
  write(
    'data/reports/import-report.json',
    JSON.stringify(
      {
        source: basename(source),
        strict: flag('strict'),
        summary,
        rejected: rows.filter((r) => r.status === 'rejected').map(({ row, raw, reason, detail }) => ({ row, raw, reason, detail })),
        flagged: rows.filter((r) => r.flags.length).map(({ row, normalized, flags, status }) => ({ row, word: normalized, flags, status })),
      },
      null,
      2,
    ) + '\n',
  );
  return summary;
}

function writeClean(rows: RowResult[], source: string) {
  const accepted = rows.filter((r) => r.status === 'accepted');
  write('data/clean/words.csv', 'word,plain_key,pattern,letters,source_row,flags\n' + accepted.map((r) => `${r.normalized},${r.plainKey},${r.pattern},${r.letters},${r.row},${r.flags.join('|')}`).join('\n') + '\n');
  const patterns: Record<string, string[]> = {};
  for (const r of accepted) (patterns[r.pattern!] ??= []).push(r.normalized);
  const file: DictionaryFile = { version: 1, source: basename(source), generatedAt: 'import', patterns };
  write('public/data/dictionary.json', JSON.stringify(file));
}

async function push(rows: RowResult[]) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno (solo para scripts locales, nunca en el frontend).');
  const runId = crypto.randomUUID();
  const accepted = rows.filter((r) => r.status === 'accepted');
  const rpc = async (fn: string, body: unknown) => {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${fn}: ${res.status} ${await res.text()}`);
    return res.json();
  };
  for (let i = 0; i < accepted.length; i += 1000) {
    const batch = accepted.slice(i, i + 1000).map((r) => ({ word: r.normalized, plain_key: r.plainKey, pattern: r.pattern, letters: r.letters, source_row: r.row, flags: r.flags }));
    await rpc('import_words_batch', { p_run: runId, p_rows: batch });
    console.log(`  ↑ ${Math.min(i + 1000, accepted.length)}/${accepted.length}`);
  }
  const result = await rpc('import_words_finalize', { p_run: runId });
  console.log('  ✓ Importación finalizada:', JSON.stringify(result));
}

async function main() {
  const { rows, source } = loadRows();
  if (command === 'validate') {
    report(rows, source);
  } else if (command === 'clean') {
    report(rows, source);
    writeClean(rows, source);
  } else if (command === 'import') {
    report(rows, source);
    writeClean(rows, source);
    if (flag('write-sql')) write('supabase/seed/words.sql', rowsToSql(rows, basename(source)));
    if (flag('push')) await push(rows);
    if (!flag('write-sql') && !flag('push')) console.log('\nDRY RUN: no se ha escrito nada en la base de datos. Usa --write-sql o --push.');
  } else {
    throw new Error(`Comando desconocido: ${command}`);
  }
}

main().catch((e) => {
  console.error('✗', e instanceof Error ? e.message : e);
  process.exit(1);
});
