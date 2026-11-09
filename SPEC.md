# SPEC — Matrículas (MVP)

> **Fuente de verdad del producto.** Cualquier cambio de reglas, puntuación, datos o seguridad se hace primero aquí y después en el código. Si el código y este documento discrepan, manda este documento.

## 0. Resumen

Microjuego web de palabras, mobile-first, en una sola pantalla (SPA). Se muestra una matrícula española `0027 · BRC`: las **tres letras** son el reto y los **cuatro números** son la puntuación acumulada (siempre 4 cifras con ceros a la izquierda, máximo `9999` en pantalla). El jugador escribe una palabra en un campo separado de la matrícula y pulsa **VALIDAR** o **PASAR**.

Stack: Vite + React + TypeScript + Tailwind CSS · Supabase (PostgreSQL + Auth) · Netlify (hosting + Functions + Scheduled Functions) · Vitest · Playwright. Sin Next.js.

## 1. Archivo de palabras (inspección real)

`data/source/Palabras.rtf` (copia del adjunto original):

| Propiedad | Valor observado |
|---|---|
| Formato | RTF 1 (Cocoa), ANSI, página de códigos 1252 |
| Estructura | **Una sola columna, sin cabecera**: una entrada por línea (párrafos separados por `\` + salto de línea) |
| Codificación de acentos | `\'xx` (cp1252); dos entradas usan `\uN` (U+2012 y U+0301) |
| Filas | 16.677 |
| Mezcla observada | palabras en minúscula, nombres propios con mayúscula inicial (`Alcalá`, `Toledo`…), siglas en mayúsculas (`ADSL`, `GPS`, `COVID`…), locuciones con espacio (`da capo`…), afijos (`‒́ptera`), una palabra con `è` (`ampère`), entradas con 4–5 consonantes (`abrepuño`…) |

No hay columnas adicionales (categoría gramatical, número, etc.). **No se inventan columnas ni palabras.**

### 1.1 Clasificación por fila (scripts/lib/word-pipeline.ts)

Cada fila acaba **aceptada** o **rechazada con motivo**; nada se descarta en silencio. Orden de comprobación:

1. `fila_vacia`
2. `multipalabra` (contiene espacios)
3. `afijo` (empieza por guion)
4. `caracteres_no_validos` (cualquier carácter fuera de a–z, ñ, á é í ó ú ü)
5. `abreviatura` (≥ 2 letras, todas mayúsculas)
6. `nombre_propio` (mayúscula inicial)
7. `consonantes_distintas_de_3`
8. `duplicado` (misma forma normalizada NFC en minúsculas que una fila anterior)
9. `bloqueada_manual` (`data/blocklist.txt`)

Avisos (no rechazan salvo `--strict`): `posible_plural` (termina en vocal + s y > 4 letras) y `posible_forma_verbal` (termina en é/ó). **Limitación**: el archivo no trae categoría gramatical, así que plurales y verbos conjugados no pueden detectarse con certeza. El flujo es: revisar `data/reports/import-report.csv`, añadir los plurales/verbos conjugados reales a `data/blocklist.txt` y los falsos positivos a `data/allowlist.txt`, y reimportar. `--strict` excluye todas las palabras con aviso.

Resultado actual (sin `--strict`): 15.635 aceptadas · 1.042 rechazadas · 348 con aviso · 2.863 patrones jugables.

### 1.2 Normalización

- Unicode **NFC**, `trim`, minúsculas `es-ES`.
- `plain_key`: sin tildes ni diéresis (la **ñ se conserva** como letra distinta). Permite escribir `arbol` y encontrar `árbol`.
- **Consonantes**: b c d f g h j k l m n ñ p q r s t v w x y z. **La Y cuenta siempre como consonante.** Dígrafos (ch, ll, rr, qu) cuentan como dos letras: `rr` son dos R.
- **Vocales**: a e i o u y sus formas á é í ó ú ü.
- Patrón consonántico: consonantes en orden (`barco → brc`).

## 2. Reglas lingüísticas

Una respuesta es válida si y solo si:

- Tiene exactamente tres consonantes, iguales a las de la matrícula, una vez cada una y en el mismo orden (`consonantPattern(palabra) === patrón`). Por tanto no se pueden añadir, eliminar, repetir, sustituir ni reordenar consonantes; solo se añaden vocales.
- Está en el diccionario procesado (`words.status = 'active'`), que ya excluye nombres propios, siglas/abreviaturas, locuciones y lo bloqueado manualmente.
- Se admiten tildes y diéresis; el jugador puede escribirlas o no.
- Se admiten masculino y femenino singular, infinitivos, gerundios y participios en singular **si están en el archivo**.
- Puede haber varias soluciones por matrícula.

Ejemplos para **BRC** (comprobados contra el archivo):

| Palabra | Resultado | Motivo |
|---|---|---|
| BARCO | válida | B-R-C, está en el archivo |
| BARCA | válida | B-R-C, está en el archivo |
| ABARCA | válida | B-R-C, está en el archivo |
| BARRACA | no válida | repite la R |
| BARRANCO | no válida | añade N |
| ABARCO | no válida | verbo conjugado (no está en el archivo) |

> Nota: *ABARCAR* aparece en el brief como ejemplo válido, pero **no está en el archivo adjunto**, así que el juego la rechaza. Para incluirla habría que añadirla al archivo de origen y reimportar.

## 3. Puntuación (src/game/scoring.ts)

| Concepto | Valor |
|---|---|
| A, E, O (con o sin tilde) | +1 cada una |
| I, U (con o sin tilde; Ü = U) | +2 cada una |
| Longitud ≤ 4 letras | +0 |
| 5–6 letras | +1 |
| 7–8 letras | +2 |
| ≥ 9 letras | +3 |
| Consonantes raras | Σ valor configurado por consonante (tabla `rare_consonant_config`, todas a 0 por defecto; sin configuración = 0) |
| Combo (solo Contrarreloj) | 1.er acierto +0 · 2.º consecutivo +1 · 3.º y siguientes +2 |
| Reto cumplido (Combo de vocales) | +3 |
| Penalizaciones | Ninguna en el MVP (fallar/pasar = 0 puntos y rompe el combo) |

Fallar o pasar rompe el combo. La puntuación definitiva **la recalcula el servidor** reproduciendo los eventos; nunca se usa el total enviado por el navegador.

## 4. Modos

| | Contrarreloj | Clásico | Combo de vocales |
|---|---|---|---|
| Rondas | Sucesivas hasta fin de tiempo (servidor entrega 80) | 10 | 10 |
| Tiempo | 120 s | Sin límite (caduca a las 24 h) | Sin límite (caduca a las 24 h) |
| Avance | Palabra correcta o PASAR | Palabra correcta o PASAR | Palabra correcta o PASAR |
| Intentos | Ilimitados | Ilimitados | Ilimitados |
| Combo | Sí | No | No |
| Condición extra | — | — | Una por matrícula; cumplirla = +3 |
| Ranking | Diario y mensual | Diario e histórico | No |

- Cada partida genera una secuencia aleatoria nueva; se puede repetir sin límite.
- Solo se conserva la mejor puntuación de cada usuario por modo y periodo.
- **Decisión Combo de vocales**: la palabra debe cumplir las reglas generales para avanzar; la condición es el reto que suma +3 si se cumple (no bloquea el avance).
- Condiciones disponibles: Usa una I · Usa una U · No uses A · No uses E · Usa exactamente tres vocales · Usa al menos tres vocales diferentes · Forma una palabra de siete letras o más. Solo se asigna una condición que cumpla al menos una solución de esa matrícula.
- Fuera de alcance: otros modos, pistas, vidas, monedas, power-ups, comodines.

## 5. Generación de matrículas (src/game/plates.ts)

- Pool = patrones con exactamente 3 consonantes y ≥ 1 solución activa (tabla `consonant_patterns` / `dictionary.json`).
- PRNG mulberry32 con semilla de 32 bits generada por el servidor (o el cliente en modo local).
- Sin repetir matrícula dentro de una partida mientras queden alternativas.
- No se iguala la dificultad: el RNG forma parte del juego.

## 6. Experiencia (una sola pantalla)

Estados: inicio/selección de modo · partida (3 modos) · feedback correcto/incorrecto · resultado · ranking · insignias y estadísticas · modal Cómo jugar · cuenta. Todo en `App.tsx` con estado en memoria; no hay rutas ni recargas.

Durante la partida: logo, matrícula protagonista (números = puntuación), cronómetro (solo Contrarreloj), progreso X/10 (Clásico y Combo), combo visible (Contrarreloj), condición (Combo), input separado, VALIDAR, PASAR, feedback inmediato, CÓMO JUGAR, accesos a ranking e insignias. El modal Cómo jugar no reinicia ni abandona la partida (en Contrarreloj el reloj sigue corriendo: es tiempo real).

Resultado: puntuación final, matrículas resueltas, pasadas, mejor palabra, mejor combo, insignias desbloqueadas, posición en ranking (si aplica), VOLVER A JUGAR.

UI: mobile-first, lenguaje visual de matrícula española (blanco, borde negro, banda azul UE con «E», tipografía condensada de alto contraste), señalética de carretera (verde = Contrarreloj, negro = Clásico, violeta = Combo). Contraste AA, foco visible, ARIA (`aria-live` en feedback, `role="dialog"` en modales), `prefers-reduced-motion`, input con `autocapitalize="characters"`, `enterkeyhint="go"`, `autocomplete="off"`, `spellcheck=false`.

## 7. Usuarios y cuentas

- Al abrir: `signInAnonymously()` → usuario anónimo persistente (sesión en localStorage de Supabase). Un trigger crea `profiles` con alias `Conductor-XXXX`.
- Alias público editable (3–20 caracteres, letras/números/espacio/guion/guion bajo, único sin distinguir mayúsculas).
- **Vincular cuenta con magic link** — fusión de datos:
  1. **Email nuevo** → `auth.updateUser({ email })` sobre el usuario anónimo. Supabase envía el enlace; al confirmarlo **el mismo `user_id` pasa a ser permanente**. No hay que mover nada: estadísticas, récords e insignias se conservan tal cual.
  2. **Email ya registrado** → el cliente guarda el access token anónimo, inicia sesión con `signInWithOtp`. Tras volver del enlace llama a `POST /api/account/merge` con el token de la cuenta (cabecera) y el token anónimo (cuerpo). La función verifica ambos y ejecuta `merge_users(from, to)` en una transacción:
     - `games` y `game_rounds` pasan al usuario destino.
     - `leaderboard_entries`: por (modo, periodo) se queda la puntuación mayor (empate: la más antigua).
     - `user_achievements`: unión; si existen en ambos, `first_unlocked_at` = mínimo, `last_unlocked_at` = máximo, `times_won` = suma.
     - Se mantiene el alias de la cuenta destino; se borra el perfil anónimo.
     - Limitación: el token anónimo debe seguir vigente (1 h por defecto en Supabase).
- Los rankings solo muestran alias, puntuación, modo, periodo y posición. Nunca email ni ids.

## 8. Datos (Supabase)

Migraciones en `supabase/migrations/`. Tablas: `profiles`, `words`, `consonant_patterns`, `games`, `game_rounds`, `leaderboard_entries`, `achievements`, `user_achievements`, `rare_consonant_config`, `period_awards` (registro idempotente de campeones). Enums: `game_mode`, `game_status`, `round_outcome`, `word_status`, `achievement_kind`, `period_type`.

RLS activado en **todas** las tablas del esquema `public`:

| Tabla | anon/authenticated |
|---|---|
| profiles | select/update propio (solo columna `alias`) |
| words, consonant_patterns | select de filas activas |
| achievements, rare_consonant_config | select |
| games, game_rounds, user_achievements | select propio |
| leaderboard_entries, period_awards | sin acceso directo; lectura pública vía `get_leaderboard()` (solo alias/puntuación/modo/periodo/posición) |

Escrituras de partidas, rankings e insignias: solo `service_role` mediante funciones `security definer` con `execute` revocado a `public/anon/authenticated`.

Periodos en zona **Europe/Madrid**: diario `YYYY-MM-DD`, mensual `YYYY-MM`, histórico `all`.

## 9. Seguridad de partidas y ranking

Flujo online:

1. `POST /api/game/start {mode}` (JWT obligatorio) → la función valida usuario, aplica rate limit en BD (`start_game`: ≤ 8 partidas/min, ≤ 200/h), genera semilla y secuencia con el diccionario de la BD, guarda `games` con `started_at` del servidor y devuelve `{gameId, plates}`.
2. El cliente juega y registra **eventos** `{t:'attempt', word, at}` / `{t:'pass', at}` (`at` = ms desde el inicio).
3. `POST /api/game/submit {gameId, events, clientElapsedMs}` → la función:
   - verifica el JWT y que la partida pertenece al usuario y está `active` (duplicados → 409);
   - carga palabras y configuración de rareza desde la BD;
   - **reproduce** los eventos con el mismo motor del cliente: consonantes, orden, existencia, vocales, longitud, rareza, combo, retos;
   - comprueba: eventos bien formados y monótonos (≤ 600, palabras ≤ 30 caracteres); tiempo cliente ≤ tiempo servidor + 3 s; Contrarreloj: envío ≤ 150 s tras el inicio y ningún evento ≥ 120 s; Clásico/Combo: 10 rondas completas y < 24 h; ≥ 800 ms entre aciertos y media ≥ 1,5 s por acierto; ningún evento tras el fin;
   - llama a `finalize_game()` que, en **una transacción con bloqueo de fila**, inserta rondas, cierra la partida, actualiza rankings con `on conflict … where excluded.best_score > best_score` y concede insignias. Una partida rechazada se marca `rejected` con motivo y no puntúa.

**Limitaciones del control temporal (documentadas)**: el cliente conoce la secuencia completa al empezar y controla su reloj. El servidor acota con su propio reloj (`started_at` → recepción) y con ritmos mínimos, pero un bot con el diccionario podría jugar «perfecto» dentro de esos límites. Mitigaciones futuras: revelar matrículas de una en una con commit por ronda, captcha/attestation, detección estadística de outliers.

## 10. Insignias

Progreso (por partida, evaluadas en servidor): Primera marcha (completar una partida) · Sin calarse (10 aciertos seguidos sin fallo ni pase) · Larga distancia (palabra ≥ 10 letras) · Hora punta (≥ 15 resueltas en Contrarreloj) · Sin GPS (Clásico 10/10 sin pasar) · Matrícula de honor (puntuación **>** umbral `achievements.config.threshold`, por defecto 100) · Coleccionista (A, E, I, O y U en una palabra).

Competitivas (tarea programada): Campeón diario Contrarreloj · Campeón mensual Contrarreloj · Campeón diario Clásico · Campeón histórico Clásico.

No acumulables: `user_achievements` tiene PK (`user_id`, `achievement_id`); volver a ganarla actualiza `last_unlocked_at`, `times_won` y `last_period_key`.

Adjudicación: función programada `award-champions` (Netlify, cron `15 0 * * *` UTC, siempre después de medianoche en Madrid) → RPC `award_period_champions()`: para cada día/mes **cerrado** sin registro en `period_awards`, otorga la insignia al primero (empate: quien la logró antes). Idempotente. El histórico Clásico se reasigna cuando cambia el líder (el anterior conserva la insignia ganada).

## 11. Modo local

Sin variables de Supabase, la app funciona en **modo local**: diccionario `public/data/dictionary.json`, secuencias generadas en el cliente, estadísticas e insignias en `localStorage`. No hay ranking (se indica en la UI). Es el modo que usan los tests E2E.

## 12. Fuera de alcance del MVP

Pistas, vidas, monedas, power-ups, comodines, otros modos, ranking de Combo de vocales, panel de administración (la configuración se edita en Supabase Studio).
