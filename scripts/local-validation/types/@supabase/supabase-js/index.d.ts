// Tipos mínimos SOLO para typecheck sin red. El proyecto real usa los tipos del paquete.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Session { access_token: string; user: User }
export interface User { id: string; email?: string; is_anonymous?: boolean }
export interface SupabaseClient {
  auth: any;
  from(table: string): any;
  rpc(fn: string, args?: Record<string, unknown>): any;
}
export function createClient(url: string, key: string, opts?: any): SupabaseClient;
