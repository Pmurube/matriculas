-- Matrículas · 0003 · Row Level Security y privilegios (SPEC.md §8)
-- RLS activado en TODAS las tablas de public. Los clientes solo leen;
-- las escrituras de partidas/rankings/insignias pasan por funciones de service_role.

alter table public.profiles enable row level security;
alter table public.words enable row level security;
alter table public.consonant_patterns enable row level security;
alter table public.games enable row level security;
alter table public.game_rounds enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.rare_consonant_config enable row level security;
alter table public.period_awards enable row level security;

-- Defensa en profundidad: sin privilegios de escritura para clientes.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.leaderboard_entries, public.period_awards from anon, authenticated;

-- profiles: cada usuario ve y edita solo su fila, y solo la columna alias.
grant select on public.profiles to authenticated;
grant update (alias) on public.profiles to authenticated;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- words / consonant_patterns: lectura pública de lo jugable.
grant select on public.words, public.consonant_patterns to anon, authenticated;
create policy words_select_active on public.words
  for select to anon, authenticated using (status = 'active');
create policy consonant_patterns_select on public.consonant_patterns
  for select to anon, authenticated using (true);

-- Catálogos de solo lectura.
grant select on public.achievements, public.rare_consonant_config to anon, authenticated;
create policy achievements_select on public.achievements
  for select to anon, authenticated using (true);
create policy rare_consonant_config_select on public.rare_consonant_config
  for select to anon, authenticated using (true);

-- Datos privados del jugador: solo lectura de lo propio.
grant select on public.games, public.game_rounds, public.user_achievements to authenticated;
create policy games_select_own on public.games
  for select to authenticated using (user_id = (select auth.uid()));
create policy game_rounds_select_own on public.game_rounds
  for select to authenticated using (
    exists (select 1 from public.games g where g.id = game_id and g.user_id = (select auth.uid()))
  );
create policy user_achievements_select_own on public.user_achievements
  for select to authenticated using (user_id = (select auth.uid()));

-- leaderboard_entries y period_awards: sin políticas => sin acceso directo.
-- La lectura pública se hace con public.get_leaderboard(), que solo devuelve
-- alias, puntuación, modo, periodo y posición.
