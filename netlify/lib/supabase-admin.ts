/**
 * Acceso a Supabase desde Netlify Functions mediante fetch (sin SDK).
 * SOLO servidor: usa SUPABASE_SERVICE_ROLE_KEY. Nunca importar desde src/.
 */

export interface AuthUser {
  id: string;
  is_anonymous: boolean;
}

export interface ServerDeps {
  getUser(token: string): Promise<AuthUser | null>;
  rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T>;
  select<T = unknown>(pathAndQuery: string): Promise<T>;
}

export class RpcError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

export function createServerDeps(): ServerDeps {
  const url = env('SUPABASE_URL').replace(/\/$/, '');
  const service = env('SUPABASE_SERVICE_ROLE_KEY');
  const anon = process.env.SUPABASE_ANON_KEY || service;
  const adminHeaders = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };

  return {
    async getUser(token) {
      if (!token) return null;
      const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const u = (await res.json()) as { id?: string; is_anonymous?: boolean };
      return u.id ? { id: u.id, is_anonymous: Boolean(u.is_anonymous) } : null;
    },
    async rpc(fn, args) {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: adminHeaders, body: JSON.stringify(args) });
      const text = await res.text();
      if (!res.ok) {
        let message = text;
        try {
          message = (JSON.parse(text) as { message?: string }).message ?? text;
        } catch {
          /* texto plano */
        }
        throw new RpcError(message, res.status);
      }
      return (text ? JSON.parse(text) : null) as never;
    },
    async select(pathAndQuery) {
      const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, { headers: adminHeaders });
      if (!res.ok) throw new RpcError(await res.text(), res.status);
      return (await res.json()) as never;
    },
  };
}
