/**
 * Comprobaciones de seguridad estáticas (SPEC §8–§9). Uso: `npm run check:security`.
 * 1. Sin secretos en el repositorio.
 * 2. Sin service role en código cliente (src/, index.html, dist/).
 * 3. RLS activado en todas las tablas creadas por las migraciones.
 * 4. Funciones SECURITY DEFINER con search_path fijado y execute revocado o concedido explícitamente.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', '.netlify', 'playwright-report', 'test-results', 'source', 'reports', 'clean']);
const problems: string[] = [];
const ok: string[] = [];

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (SKIP.has(f)) continue;
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (st.size < 2_000_000) out.push(p);
  }
  return out;
}
const rel = (p: string) => relative(ROOT, p);

// 1. Secretos
const SECRET_PATTERNS: [string, RegExp][] = [
  ['JWT (posible clave Supabase)', /eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/],
  ['Clave secreta Supabase (sb_secret_)', /sb_secret_[A-Za-z0-9_-]{10,}/],
  ['Clave privada', /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Service role con valor', /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?[A-Za-z0-9._-]{20,}/],
];
const files = walk(ROOT).filter((f) => !rel(f).startsWith('dist/'));
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const [name, re] of SECRET_PATTERNS) if (re.test(text)) problems.push(`Secreto (${name}) en ${rel(f)}`);
}
for (const f of readdirSync(ROOT)) if (/^\.env(\..+)?$/.test(f) && f !== '.env.example') {
  const ignored = readFileSync(join(ROOT, '.gitignore'), 'utf8').split('\n').some((l) => l.trim() === '.env' || l.trim() === '.env.*');
  if (!ignored) problems.push(`${f} existe y no está en .gitignore`);
}
ok.push(`Escaneados ${files.length} archivos en busca de secretos`);

// 2. Service role en cliente
const clientFiles = [...walk(join(ROOT, 'src')), join(ROOT, 'index.html'), ...walk(join(ROOT, 'dist'))].filter(existsSync);
for (const f of clientFiles) {
  const text = readFileSync(f, 'utf8');
  if (/service_role|SERVICE_ROLE/i.test(text)) problems.push(`Referencia a service role en código cliente: ${rel(f)}`);
  if (/VITE_[A-Z_]*SERVICE/i.test(text)) problems.push(`Variable VITE_ con SERVICE en ${rel(f)}`);
}
ok.push(`Service role ausente en ${clientFiles.length} archivos cliente (src/, index.html, dist/)`);

// 3 y 4. Migraciones
const migDir = join(ROOT, 'supabase/migrations');
const sql = readdirSync(migDir).sort().map((f) => readFileSync(join(migDir, f), 'utf8')).join('\n');
const tables = [...sql.matchAll(/create table (?:if not exists )?public\.(\w+)/gi)].map((m) => m[1]);
const rls = new Set([...sql.matchAll(/alter table public\.(\w+) enable row level security/gi)].map((m) => m[1]));
for (const t of tables) if (!rls.has(t)) problems.push(`Tabla sin RLS: public.${t}`);
ok.push(`RLS activado en ${tables.filter((t) => rls.has(t)).length}/${tables.length} tablas: ${tables.join(', ')}`);

const fnBlocks = [...sql.matchAll(/create or replace function (public\.\w+)\(([\s\S]*?)\$\$;/gi)];
for (const [block, name] of fnBlocks) {
  if (/security definer/i.test(block) && !/set search_path\s*=\s*''/i.test(block)) problems.push(`${name} es SECURITY DEFINER sin search_path vacío`);
  if (/security definer/i.test(block) && !new RegExp(`(revoke|grant) execute on function ${name.replace('.', '\\.')}\\(`, 'i').test(sql)) {
    problems.push(`${name} es SECURITY DEFINER sin revoke/grant explícito`);
  }
}
ok.push(`${fnBlocks.length} funciones SQL revisadas (search_path y permisos de ejecución)`);
const writeGrants = [...sql.matchAll(/grant (insert|update|delete)[^;]* to ([^;]+);/gi)].filter((m) => /anon|authenticated/.test(m[2]));
for (const g of writeGrants) if (!/grant update \(alias\) on public\.profiles to authenticated/i.test(g[0])) problems.push(`Privilegio de escritura a clientes: ${g[0]}`);
ok.push('Únicos privilegios de escritura para clientes: update(alias) en profiles');

for (const o of ok) console.log(`  ✓ ${o}`);
if (problems.length) {
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log('\nSeguridad: sin problemas detectados.');
