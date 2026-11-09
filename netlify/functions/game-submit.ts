import { handleSubmit } from '../lib/handlers.ts';
import { createServerDeps } from '../lib/supabase-admin.ts';

export default (req: Request) => handleSubmit(req, createServerDeps());

export const config = { path: '/api/game/submit' };
