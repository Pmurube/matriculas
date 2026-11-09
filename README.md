# Matrículas · Añade vocales, forma palabras

Microjuego web mobile-first basado en matrículas españolas: `0027 · BRC` → las letras son el reto y los números tu puntuación. Escribe una palabra que use **B, R, C** en ese orden añadiendo solo vocales (BARCO, BARCA, ABARCA…).

> **Fuente de verdad: [SPEC.md](SPEC.md).** Agentes de código: lee [CLAUDE.md](CLAUDE.md).

Stack: Vite · React 19 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL + Auth) · Netlify (+ Functions + Scheduled Functions) · Vitest · Playwright.

---

## 1. Arranque rápido (modo local, sin credenciales)

```bash
npm install
npm run dev            # http://localhost:5173
```

Sin variables `VITE_SUPABASE_*` la app funciona en **modo local**: diccionario estático (`public/data/dictionary.json`), partidas generadas en el navegador, estadísticas e insignias en `localStorage`, sin ranking.

## 2. Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Vite en desarrollo (solo frontend) |
| `npm run dev:netlify` | Frontend + Functions en local (`netlify dev`, requiere Netlify CLI y `.env`) |
| `npm run build` / `npm run preview` | Build de producción / servirlo en :4173 |
| `npm run lint` | ESLint (typescript-eslint) |
| `npm run typecheck` | `tsc --noEmit` estricto |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests E2E (Playwright; levanta build + preview en modo local). La primera vez: `npx playwright install chromium` |
| `npm run check:security` | Secretos, service role en cliente, RLS, `search_path`, privilegios |
| `npm run verify` | lint + typecheck + unit + build + seguridad |
| `npm run words:validate` | Valida el listado y escribe el informe (`data/reports/`) |
| `npm run words:clean` | + `data/clean/words.csv` y `public/data/dictionary.json` |
| `npm run words:import` | **Dry run** completo (no toca la BD) |
| `npm run words:sql` | Genera `supabase/seed/words.sql` (idempotente) |
| `npm run words:push` | Sube a Supabase por RPC (necesita `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en tu shell) |

Opciones del CLI de palabras: `--source ruta/al/archivo.rtf|.txt` y `--strict` (excluye las palabras con aviso de posible plural/verbo conjugado).

## 3. Archivo de palabras e importación

El adjunto (`data/source/Palabras.rtf`) es un RTF de **una sola columna sin cabecera**, una entrada por línea. Detalle de la inspección y reglas de limpieza en SPEC §1.

Resultado actual: **16.677 filas → 15.635 aceptadas, 1.042 rechazadas (cada una con motivo), 348 con aviso para revisión, 2.863 matrículas jugables.**

Flujo recomendado:

1. `npm run words:import` y revisa `data/reports/import-report.csv` (columna *motivo* y *avisos*).
2. Plurales o verbos conjugados reales → añádelos a `data/blocklist.txt`. Falsos positivos (p. ej. *lunes*, *tesis*) → `data/allowlist.txt`.
3. Repite el dry run, después `npm run words:sql` o `npm run words:push`.

El archivo no trae categoría gramatical, así que los plurales y verbos conjugados **no pueden detectarse con certeza**; por eso hay revisión manual (ver SPEC §1.1). Nota: *ABARCAR* (ejemplo del brief) no está en el archivo y por tanto el juego la rechaza.

## 4. Configuración de Supabase (paso a paso)

1. Crea un proyecto en <https://supabase.com>.
2. **Authentication → Sign In / Providers**: activa **Anonymous sign-ins** y **Email**.
3. **Authentication → URL Configuration**: *Site URL* = tu URL de Netlify; añade en *Redirect URLs* `http://localhost:5173`, `http://localhost:8888` y tu dominio.
4. Aplica las migraciones (Supabase CLI):
   ```bash
   npx supabase login
   npx supabase link --project-ref <TU_PROJECT_REF>
   npx supabase db push
   ```
   (Alternativa sin CLI: pega en el SQL Editor, en orden, los tres archivos de `supabase/migrations/`.)
5. Seed de insignias y configuración: SQL Editor → contenido de `supabase/seed.sql`.
6. Palabras (elige una):
   ```bash
   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service_role> npm run words:push
   # o: psql "<connection string>" -f supabase/seed/words.sql
   ```
7. (Opcional) Umbral de *Matrícula de honor* y bonus de consonantes raras: tablas `achievements.config` y `rare_consonant_config` (SPEC §3 y §10).

## 5. Variables de entorno — dónde va cada credencial

| Variable | Dónde | Pública |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` (dev) y Netlify (Builds) | Sí |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` (dev) y Netlify (Builds) | Sí (protegida por RLS) |
| `SUPABASE_URL` | Netlify (Functions) y `.env` para `netlify dev` | No |
| `SUPABASE_ANON_KEY` | Netlify (Functions) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo** Netlify (Functions) y tu shell para `words:push` | **Secreta** |
| `ALLOWED_ORIGINS` | Netlify (Functions), opcional | No |

Copia `.env.example` a `.env.local` (frontend) o `.env` (netlify dev). Nunca pongas la service role con prefijo `VITE_`: se incrustaría en el bundle. `npm run check:security` falla si ocurre.

## 6. Despliegue en Netlify

1. Sube el repo a GitHub y conéctalo en Netlify (*Add new site → Import from Git*). La configuración sale de `netlify.toml`.
2. Añade las variables de la tabla anterior.
3. Deploy. Funciones creadas: `POST /api/game/start`, `POST /api/game/submit`, `POST /api/account/merge` y la programada `award-champions` (`15 0 * * *` UTC).
4. Sigue [docs/CHECKLISTS.md](docs/CHECKLISTS.md) (despliegue, seguridad y pruebas manuales).

## 7. Arquitectura

```
src/game/          núcleo puro (reglas, puntuación, motor de eventos, verificación) — compartido
src/components/    UI (matrícula, HUD, formulario, modales)
src/hooks/         useGame (estado de partida y cronómetro), useAccount (sesión anónima, alias, magic link)
src/lib/           Supabase (anon key), API /api/*, diccionario, localStorage
netlify/functions/ entradas de las funciones; lógica en netlify/lib/handlers.ts
supabase/          migraciones, seed, config del CLI
scripts/           CLI de palabras, comprobación de seguridad, validación local
e2e/               Playwright · tests/ helpers de Vitest
```

Flujo online: `start` (el servidor genera semilla y secuencia y guarda `started_at`) → el cliente juega y registra eventos → `submit` (el servidor reproduce los eventos con el mismo motor, valida contra la BD, comprueba tiempos/ritmo y guarda de forma atómica con `finalize_game`). Detalles y limitaciones en SPEC §9.

Fusión de cuentas al iniciar sesión: SPEC §7.

## 8. Validación ejecutada en el entorno de generación

El entorno donde se generó este proyecto **no tenía acceso al registro npm** ni a PostgreSQL. Se validó con las herramientas disponibles sin red:

| Comprobación | Resultado | Cómo |
|---|---|---|
| Importación del archivo real | ✅ 16.677 filas clasificadas | `node scripts/words-cli.ts import --write-sql` |
| Tests unitarios | ✅ 70/70 | Vitest 4.1.12 |
| Linter | ✅ 0 errores (63 archivos) | ESLint 10.8.1 + typescript-eslint 8.56.1 |
| Typecheck del núcleo, funciones y scripts | ✅ 0 errores | `tsc` 5.9.3 estricto |
| Typecheck de la UI | ⚠️ Parcial | Tipos mínimos de React (sin `@types/react`); 4 avisos son artefactos de esos tipos |
| Build de producción | ✅ | Vite 8.1.6 con un shim de Tailwind (`scripts/local-validation/`) y stub del SDK de Supabase |
| E2E | ✅ 14/14 escenarios (móvil + escritorio) | Mismos escenarios que `e2e/game.spec.ts` ejecutados con Playwright para Python + Chromium; `@playwright/test` no estaba instalable |
| Seguridad estática | ✅ | `npm run check:security` (y prueba negativa: detecta secretos, service role en cliente y tablas sin RLS) |
| Migraciones SQL | ⚠️ No ejecutadas | Sin PostgreSQL disponible; revisadas estáticamente |
| Functions contra Supabase real | ⚠️ No ejecutadas | Testeadas con dependencias simuladas (`netlify/lib/handlers.test.ts`) |

**Lo primero que debes hacer en tu máquina:** `npm install && npm run verify && npx playwright install chromium && npm run test:e2e`. Las versiones de `package.json` son las validadas aquí salvo `@tailwindcss/vite`, `@supabase/supabase-js`, `@playwright/test` y `@types/react*`, que no pudieron instalarse; si npm reporta un conflicto de *peer dependencies*, ajusta esas versiones.

`scripts/local-validation/` solo existe para reproducir esta validación sin red; puedes borrarlo.
