/** Utilidades HTTP comunes a las funciones /api/*. */

export const MAX_BODY_BYTES = 64 * 1024;

export function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

export function bearer(req: Request): string {
  const h = req.headers.get('authorization') ?? '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

/** Solo mismo origen (o ALLOWED_ORIGINS). Las peticiones sin Origin (curl, server) se dejan pasar: requieren JWT igualmente. */
export function originAllowed(req: Request, allowed = process.env.ALLOWED_ORIGINS ?? ''): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const self = new URL(req.url);
    if (o.host === self.host) return true;
    return allowed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(o.origin);
  } catch {
    return false;
  }
}

export async function readJson(req: Request): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; res: Response }> {
  if (req.method !== 'POST') return { ok: false, res: json(405, { error: 'method_not_allowed' }, { Allow: 'POST' }) };
  if (!originAllowed(req)) return { ok: false, res: json(403, { error: 'origin_not_allowed' }) };
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return { ok: false, res: json(415, { error: 'json_required' }) };
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return { ok: false, res: json(413, { error: 'body_too_large' }) };
  try {
    const body = JSON.parse(text);
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error();
    return { ok: true, body };
  } catch {
    return { ok: false, res: json(400, { error: 'invalid_json' }) };
  }
}

/** Rate limit en memoria por instancia (complementa el de la BD). Mejor esfuerzo. */
const buckets = new Map<string, { count: number; reset: number }>();
export function memoryRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) buckets.clear();
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export function clientIp(req: Request): string {
  return req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
