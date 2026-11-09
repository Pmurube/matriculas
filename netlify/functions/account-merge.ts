import { handleMerge } from '../lib/handlers.ts';
import { createServerDeps } from '../lib/supabase-admin.ts';

export default (req: Request) => handleMerge(req, createServerDeps());

export const config = { path: '/api/account/merge' };
