import { runAwardChampions } from '../lib/handlers.ts';
import { createServerDeps } from '../lib/supabase-admin.ts';

/**
 * Función programada (schedule en netlify.toml: "15 0 * * *" UTC).
 * Adjudica las insignias competitivas de los periodos cerrados. Idempotente.
 * Las funciones programadas no son invocables por URL pública en producción.
 */
export default async () => {
  const result = await runAwardChampions(createServerDeps());
  console.log('[award-champions]', JSON.stringify(result));
  return new Response(null, { status: 204 });
};
