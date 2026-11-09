import { handleStart } from '../lib/handlers.ts';
import { createServerDeps } from '../lib/supabase-admin.ts';

export default (req: Request) => handleStart(req, createServerDeps());

export const config = { path: '/api/game/start' };
