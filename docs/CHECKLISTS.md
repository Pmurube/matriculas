# Checklists

## 1. Despliegue

### Supabase
- [ ] Proyecto creado (región UE recomendada).
- [ ] **Authentication → Sign In / Providers → Anonymous sign-ins: ON**.
- [ ] **Authentication → Providers → Email: ON** (magic link). Opcional: SMTP propio para producción (el SMTP de Supabase tiene límites bajos).
- [ ] **Authentication → URL Configuration**: Site URL = `https://TU-SITIO.netlify.app`; Redirect URLs incluye esa URL y `http://localhost:5173`, `http://localhost:8888`.
- [ ] Migraciones aplicadas: `supabase link --project-ref <ref>` + `supabase db push`.
- [ ] Seed aplicado: `psql "$SUPABASE_DB_URL" -f supabase/seed.sql`.
- [ ] Palabras cargadas: `npm run words:push` (o `psql … -f supabase/seed/words.sql`).
- [ ] Comprobado en SQL editor: `select count(*) from words where status='active';` → 15635 y `select count(*) from consonant_patterns;` → 2863 (con el archivo actual).
- [ ] Umbral de *Matrícula de honor* revisado: `update achievements set config = '{"threshold": 100}' where id = 'matricula_de_honor';`
- [ ] Bonus de consonantes raras decidido (o dejado a 0): `update rare_consonant_config set bonus = … where consonant = …;`

### Netlify
- [ ] Repo conectado; build detectado desde `netlify.toml` (`npm run build`, publish `dist`, functions `netlify/functions`).
- [ ] Variables en **Site configuration → Environment variables**:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (scope: Builds)
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (scope: Functions; **nunca** con prefijo `VITE_`)
  - `ALLOWED_ORIGINS` (opcional, p. ej. dominio propio)
- [ ] Deploy correcto; en **Functions** aparecen `game-start`, `game-submit`, `account-merge` y `award-champions` (Scheduled).
- [ ] Dominio propio añadido también en Supabase Redirect URLs.

## 2. Seguridad

- [ ] `npm run check:security` en verde (secretos, service role en cliente, RLS, `search_path`, privilegios).
- [ ] `.env*` no versionados (salvo `.env.example` vacío).
- [ ] La service role solo existe en Netlify (Functions) y en tu máquina para `words:push`.
- [ ] Probar con la anon key que **no** se puede: `insert` en `games`, `leaderboard_entries`, `user_achievements`; `select` en `leaderboard_entries`; `update` de `profiles` ajenos; `rpc('finalize_game')`.
- [ ] `get_leaderboard` devuelve solo `position, alias, score, mode, period_type, period_key`.
- [ ] Reenviar una partida ya enviada devuelve **409**.
- [ ] Enviar eventos con `at` decrecientes o aciertos cada 100 ms → **422 rejected**.
- [ ] Más de 8 partidas/min por usuario → **429**.
- [ ] Cabeceras CSP/X-Frame-Options presentes (`curl -I https://…`).
- [ ] Limitación conocida documentada (SPEC §9): el cliente conoce la secuencia y controla su reloj; el servidor acota tiempos y ritmo, no impide bots perfectos dentro de esos límites.

## 3. Pruebas manuales

### Móvil (iOS Safari y Android Chrome)
- [ ] Al pulsar ARRANCAR el teclado se abre y el campo queda enfocado.
- [ ] VALIDAR y PASAR no cierran el teclado; Enter/«Ir» valida.
- [ ] La matrícula cabe sin desbordar a 320 px; no hay scroll horizontal.
- [ ] Botones ≥ 44 px, alcanzables con el pulgar.

### Juego
- [ ] BRC: BARCO, BARCA, ABARCA válidas; BARRACA, BARRANCO, ABARCO rechazadas con mensaje claro.
- [ ] Escribir sin tildes funciona (`barico` → BÁRICO).
- [ ] La puntuación de la matrícula siempre tiene 4 cifras.
- [ ] Contrarreloj: cronómetro baja, combo sube con aciertos y vuelve a 0 al fallar o pasar; termina a 02:00 con resumen.
- [ ] Clásico: progreso X/10; sin reloj; 10/10 sin pasar → *Sin GPS*.
- [ ] Combo de vocales: condición visible; +3 cuando se cumple.
- [ ] CÓMO JUGAR durante una partida no la reinicia (en Contrarreloj el reloj sigue).
- [ ] VOLVER A JUGAR genera una secuencia distinta.
- [ ] Con `prefers-reduced-motion` activado no hay animaciones perceptibles.
- [ ] Navegación solo con teclado: foco visible, modales con Escape y foco atrapado.

### Online
- [ ] Al abrir, se crea un usuario anónimo (Supabase → Authentication → Users).
- [ ] Cambiar alias; alias duplicado muestra error.
- [ ] Partida Contrarreloj aparece en ranking Hoy y Mes; Clásico en Hoy e Histórico; Combo no aparece.
- [ ] Solo cuenta la mejor puntuación de cada usuario por periodo.
- [ ] Vincular email nuevo → enlace → mismo usuario, se conservan récords e insignias.
- [ ] Vincular email ya existente desde otro dispositivo → enlace → partidas anónimas fusionadas.
- [ ] Ejecutar `select public.award_period_champions(now() + interval '1 day');` en un entorno de pruebas y comprobar insignias competitivas sin duplicados (repetir la llamada no cambia nada).
