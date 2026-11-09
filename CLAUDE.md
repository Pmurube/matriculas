# CLAUDE.md — instrucciones para agentes de código

## Regla nº 1: SPEC.md manda

**Antes de cualquier cambio, lee `SPEC.md` completo.** Es la fuente de verdad de reglas lingüísticas, puntuación, modos, datos, seguridad e insignias.

- Si una petición contradice SPEC.md, **detente y señálalo** antes de programar.
- Si cambias comportamiento, **actualiza SPEC.md en el mismo cambio** (primero el documento, luego el código y los tests).
- No inventes palabras, columnas ni reglas. El diccionario sale solo de `data/source/` mediante `scripts/words-cli.ts`.

## Mapa del código

| Ruta | Qué es |
|---|---|
| `src/game/` | Núcleo puro compartido por cliente, Netlify Functions y scripts (normalización, reglas, puntuación, motor, verificación). **Toda regla vive aquí una sola vez.** |
| `src/components/`, `src/hooks/`, `src/App.tsx` | UI de una sola pantalla |
| `src/lib/` | Supabase (anon key), API, almacenamiento local |
| `netlify/lib/handlers.ts` | Lógica de `/api/*` con dependencias inyectadas (testeable) |
| `netlify/functions/` | Entradas finas de las funciones |
| `supabase/migrations/` | Esquema, funciones SQL y RLS (versionadas, nunca editar una migración ya aplicada: crear otra) |
| `scripts/words-cli.ts` | Validación, limpieza e importación del listado |

## Invariantes que no se pueden romper

1. La service role **nunca** en `src/`, `index.html` ni variables `VITE_*`. `npm run check:security` lo verifica.
2. RLS activado en toda tabla nueva de `public`, con políticas mínimas. Las escrituras de partidas/rankings/insignias solo vía funciones `security definer` ejecutables por `service_role`.
3. El servidor recalcula la puntuación reproduciendo eventos con `src/game/engine.ts`; nunca acepta totales del cliente.
4. Rankings públicos solo exponen alias, puntuación, modo, periodo y posición.
5. No añadir modos, pistas, vidas, monedas, power-ups ni comodines (fuera de alcance).
6. Respetar accesibilidad: etiquetas, foco visible, ARIA, `prefers-reduced-motion`.

## Antes de dar algo por terminado

```bash
npm run verify        # lint + typecheck + tests unitarios + build + check:security
npm run test:e2e      # Playwright (modo local)
```

No afirmes que algo funciona sin haberlo ejecutado.
