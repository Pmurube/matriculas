-- Matrículas · 0002 · Funciones SQL / RPC (SPEC.md §8–§10)
-- Todas usan search_path vacío y nombres cualificados.
-- Las funciones de escritura son SECURITY DEFINER y solo las puede ejecutar service_role.

-- ── Periodos en Europe/Madrid ────────────────────────────────────────────────
create or replace function public.period_key(p_type public.period_type, p_at timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'daily' then to_char(p_at at time zone 'Europe/Madrid', 'YYYY-MM-DD')
    when 'monthly' then to_char(p_at at time zone 'Europe/Madrid', 'YYYY-MM')
    else 'all'
  end;
$$;

create or replace function public.mode_periods(p_mode public.game_mode)
returns public.period_type[]
language sql
immutable
set search_path = ''
as $$
  select case p_mode
    when 'contrarreloj' then array['daily', 'monthly']::public.period_type[]
    when 'clasico' then array['daily', 'alltime']::public.period_type[]
    else array[]::public.period_type[]
  end;
$$;

-- ── Diccionario ──────────────────────────────────────────────────────────────
create or replace function public.refresh_consonant_patterns()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.consonant_patterns;
  insert into public.consonant_patterns (pattern, solutions_count, updated_at)
  select w.pattern, count(*), now()
  from public.words w
  where w.status = 'active' and char_length(w.pattern) = 3
  group by w.pattern;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Importación idempotente por lotes (scripts/words-cli.ts import --push).
create or replace function public.import_words_batch(p_run uuid, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows debe ser un array' using errcode = '22023';
  end if;
  insert into public.words (word, plain_key, pattern, letters, source_row, flags, status, import_run)
  select x.word, x.plain_key, x.pattern, x.letters, x.source_row, coalesce(x.flags, '{}'), 'active', p_run
  from jsonb_to_recordset(p_rows)
    as x(word text, plain_key text, pattern text, letters smallint, source_row integer, flags text[])
  on conflict (word) do update
    set plain_key = excluded.plain_key,
        pattern = excluded.pattern,
        letters = excluded.letters,
        source_row = excluded.source_row,
        flags = excluded.flags,
        status = 'active',
        import_run = excluded.import_run;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Cierra una importación: bloquea (no borra) lo que ya no está en el archivo.
create or replace function public.import_words_finalize(p_run uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_blocked integer;
  v_patterns integer;
begin
  update public.words set status = 'blocked'
  where status = 'active' and import_run is distinct from p_run;
  get diagnostics v_blocked = row_count;
  v_patterns := public.refresh_consonant_patterns();
  return jsonb_build_object(
    'active', (select count(*) from public.words where status = 'active'),
    'blocked_now', v_blocked,
    'patterns', v_patterns
  );
end;
$$;

-- Snapshot del diccionario activo para las Netlify Functions (validación en servidor).
create or replace function public.dictionary_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(w.word order by w.word), '[]'::jsonb)
  from public.words w
  where w.status = 'active';
$$;

-- ── Partidas ─────────────────────────────────────────────────────────────────
create or replace function public.start_game(
  p_user uuid,
  p_mode public.game_mode,
  p_seed bigint,
  p_plates jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  -- Rate limiting (SPEC §9): ≤ 8 partidas/minuto y ≤ 200/hora por usuario.
  if (select count(*) from public.games where user_id = p_user and started_at > now() - interval '1 minute') >= 8
     or (select count(*) from public.games where user_id = p_user and started_at > now() - interval '1 hour') >= 200 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  -- Caducan partidas activas antiguas del usuario.
  update public.games set status = 'expired'
  where user_id = p_user and status = 'active' and started_at < now() - interval '24 hours';

  insert into public.games (user_id, mode, seed, plates)
  values (p_user, p_mode, p_seed, p_plates)
  returning id into v_id;
  return v_id;
end;
$$;

-- Lectura de la partida para el envío (la función serverless valida propiedad y estado).
create or replace function public.get_game_for_submit(p_game_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', g.id, 'user_id', g.user_id, 'mode', g.mode, 'status', g.status,
    'plates', g.plates, 'started_at', g.started_at,
    'server_now', now(),
    'rare_config', coalesce((select jsonb_object_agg(r.consonant, r.bonus) from public.rare_consonant_config r where r.bonus > 0), '{}'::jsonb),
    'honor_threshold', coalesce((select (a.config ->> 'threshold')::int from public.achievements a where a.id = 'matricula_de_honor'), 100),
    'recent_submits', (select count(*) from public.games x where x.user_id = g.user_id and x.submitted_at > now() - interval '1 minute')
  )
  from public.games g
  where g.id = p_game_id;
$$;

-- Escritura atómica del resultado validado (SPEC §9).
create or replace function public.finalize_game(p_game_id uuid, p_user uuid, p_result jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games%rowtype;
  v_score integer := coalesce((p_result ->> 'score')::int, 0);
  v_period public.period_type;
  v_key text;
  v_ranks jsonb := '[]'::jsonb;
  v_new jsonb := '[]'::jsonb;
  v_threshold integer;
  v_ids text[];
  v_pos bigint;
  v_best integer;
begin
  select * into g from public.games where id = p_game_id for update;
  if not found then raise exception 'game_not_found' using errcode = 'P0002'; end if;
  if g.user_id <> p_user then raise exception 'forbidden' using errcode = '42501'; end if;
  if g.status <> 'active' then raise exception 'already_submitted' using errcode = 'P0003'; end if;

  if p_result ->> 'status' = 'rejected' then
    update public.games
      set status = 'rejected', rejection_reason = coalesce(p_result ->> 'reason', 'desconocido'),
          submitted_at = now(),
          client_elapsed_ms = (p_result ->> 'client_elapsed_ms')::int,
          server_elapsed_ms = (p_result ->> 'server_elapsed_ms')::int
      where id = p_game_id;
    return jsonb_build_object('status', 'rejected', 'reason', p_result ->> 'reason');
  end if;

  insert into public.game_rounds (
    game_id, round_index, pattern, challenge, outcome, word, points, vowel_points,
    length_bonus, rare_bonus, combo_bonus, challenge_bonus, failed_attempts, at_ms
  )
  select p_game_id, r.round_index, r.pattern, r.challenge, r.outcome, r.word, r.points, r.vowel_points,
         r.length_bonus, r.rare_bonus, r.combo_bonus, r.challenge_bonus, r.failed_attempts, r.at_ms
  from jsonb_to_recordset(coalesce(p_result -> 'rounds', '[]'::jsonb)) as r(
    round_index smallint, pattern text, challenge text, outcome public.round_outcome, word text,
    points smallint, vowel_points smallint, length_bonus smallint, rare_bonus smallint,
    combo_bonus smallint, challenge_bonus smallint, failed_attempts smallint, at_ms integer
  );

  update public.games
    set status = 'finished', submitted_at = now(), score = v_score,
        solved_count = (p_result ->> 'solved')::smallint,
        passed_count = (p_result ->> 'passed')::smallint,
        best_word = p_result ->> 'best_word',
        best_combo = (p_result ->> 'best_combo')::smallint,
        client_elapsed_ms = (p_result ->> 'client_elapsed_ms')::int,
        server_elapsed_ms = (p_result ->> 'server_elapsed_ms')::int
    where id = p_game_id;

  -- Rankings: solo se conserva la mejor puntuación por usuario/modo/periodo.
  foreach v_period in array public.mode_periods(g.mode) loop
    v_best := null;
    v_key := public.period_key(v_period, g.started_at);
    if v_score > 0 then
      insert into public.leaderboard_entries (user_id, mode, period_type, period_key, best_score, game_id, achieved_at)
      values (p_user, g.mode, v_period, v_key, v_score, p_game_id, now())
      on conflict (mode, period_type, period_key, user_id) do update
        set best_score = excluded.best_score, game_id = excluded.game_id, achieved_at = excluded.achieved_at
        where excluded.best_score > public.leaderboard_entries.best_score;
    end if;
    select e.best_score into v_best from public.leaderboard_entries e
      where e.user_id = p_user and e.mode = g.mode and e.period_type = v_period and e.period_key = v_key;
    if v_best is not null then
      select 1 + count(*) into v_pos
      from public.leaderboard_entries o, public.leaderboard_entries me
      where me.user_id = p_user and me.mode = g.mode and me.period_type = v_period and me.period_key = v_key
        and o.mode = me.mode and o.period_type = me.period_type and o.period_key = me.period_key
        and (o.best_score > me.best_score or (o.best_score = me.best_score and o.achieved_at < me.achieved_at));
      v_ranks := v_ranks || jsonb_build_object('period_type', v_period, 'period_key', v_key, 'position', v_pos, 'best_score', v_best);
    end if;
  end loop;

  -- Insignias de progreso. "matricula_de_honor" se calcula aquí con el umbral configurado.
  select coalesce((a.config ->> 'threshold')::int, 100) into v_threshold
    from public.achievements a where a.id = 'matricula_de_honor';
  select array_agg(distinct x) into v_ids
  from (
    select jsonb_array_elements_text(coalesce(p_result -> 'achievements', '[]'::jsonb)) as x
    union all
    select 'matricula_de_honor' where v_score > coalesce(v_threshold, 100)
  ) s
  where s.x <> 'matricula_de_honor' or v_score > coalesce(v_threshold, 100);

  with up as (
    insert into public.user_achievements (user_id, achievement_id, last_game_id)
    select p_user, a.id, p_game_id
    from public.achievements a
    where a.kind = 'progress' and a.id = any (coalesce(v_ids, '{}'))
    on conflict (user_id, achievement_id) do update
      set last_unlocked_at = now(),
          times_won = public.user_achievements.times_won + 1,
          last_game_id = excluded.last_game_id
    returning achievement_id, (xmax = 0) as inserted
  )
  select coalesce(jsonb_agg(achievement_id), '[]'::jsonb) into v_new from up where inserted;

  return jsonb_build_object('status', 'finished', 'score', v_score, 'ranks', v_ranks, 'new_achievements', v_new);
end;
$$;

-- ── Ranking público (solo alias, puntuación, modo, periodo y posición) ───────
create or replace function public.get_leaderboard(
  p_mode public.game_mode,
  p_period public.period_type,
  p_period_key text default null,
  p_limit integer default 20
)
returns table (
  "position" bigint,
  alias text,
  score integer,
  mode public.game_mode,
  period_type public.period_type,
  period_key text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    row_number() over (order by e.best_score desc, e.achieved_at asc) as "position",
    p.alias,
    e.best_score,
    e.mode,
    e.period_type,
    e.period_key
  from public.leaderboard_entries e
  join public.profiles p on p.id = e.user_id
  where e.mode = p_mode
    and e.period_type = p_period
    and e.period_key = coalesce(p_period_key, public.period_key(p_period, now()))
  order by e.best_score desc, e.achieved_at asc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

create or replace function public.get_my_leaderboard_position(
  p_mode public.game_mode,
  p_period public.period_type,
  p_period_key text default null
)
returns table ("position" bigint, score integer, period_key text)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select e.* from public.leaderboard_entries e
    where e.user_id = (select auth.uid())
      and e.mode = p_mode and e.period_type = p_period
      and e.period_key = coalesce(p_period_key, public.period_key(p_period, now()))
  )
  select
    1 + (select count(*) from public.leaderboard_entries o
         where o.mode = me.mode and o.period_type = me.period_type and o.period_key = me.period_key
           and (o.best_score > me.best_score or (o.best_score = me.best_score and o.achieved_at < me.achieved_at))),
    me.best_score,
    me.period_key
  from me;
$$;

-- ── Campeones por periodo (tarea programada, idempotente) ───────────────────
create or replace function public.grant_competitive(p_user uuid, p_achievement text, p_period_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_achievements (user_id, achievement_id, last_period_key)
  values (p_user, p_achievement, p_period_key)
  on conflict (user_id, achievement_id) do update
    set last_unlocked_at = now(),
        times_won = public.user_achievements.times_won + 1,
        last_period_key = excluded.last_period_key;
$$;

create or replace function public.award_period_champions(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today text := public.period_key('daily', p_now);
  v_month text := public.period_key('monthly', p_now);
  v_awarded integer := 0;
  rec record;
  v_top_user uuid;
  v_top_score integer;
  v_holder uuid;
begin
  -- Diarios y mensuales cerrados sin adjudicar (recupera ejecuciones perdidas).
  for rec in
    select distinct
      case
        when e.mode = 'contrarreloj' and e.period_type = 'daily' then 'campeon_diario_contrarreloj'
        when e.mode = 'contrarreloj' and e.period_type = 'monthly' then 'campeon_mensual_contrarreloj'
        when e.mode = 'clasico' and e.period_type = 'daily' then 'campeon_diario_clasico'
      end as achievement_id,
      e.mode, e.period_type, e.period_key
    from public.leaderboard_entries e
    where (e.period_type = 'daily' and e.period_key < v_today)
       or (e.period_type = 'monthly' and e.period_key < v_month)
  loop
    continue when rec.achievement_id is null;
    continue when exists (select 1 from public.period_awards pa where pa.achievement_id = rec.achievement_id and pa.period_key = rec.period_key);
    v_top_user := null;
    select e.user_id, e.best_score into v_top_user, v_top_score
    from public.leaderboard_entries e
    where e.mode = rec.mode and e.period_type = rec.period_type and e.period_key = rec.period_key
    order by e.best_score desc, e.achieved_at asc
    limit 1;
    continue when v_top_user is null;
    insert into public.period_awards (achievement_id, period_key, user_id, score)
    values (rec.achievement_id, rec.period_key, v_top_user, v_top_score)
    on conflict do nothing;
    if found then
      perform public.grant_competitive(v_top_user, rec.achievement_id, rec.period_key);
      v_awarded := v_awarded + 1;
    end if;
  end loop;

  -- Histórico Clásico: se concede al líder actual cuando cambia.
  v_top_user := null;
  select e.user_id, e.best_score into v_top_user, v_top_score
  from public.leaderboard_entries e
  where e.mode = 'clasico' and e.period_type = 'alltime' and e.period_key = 'all'
  order by e.best_score desc, e.achieved_at asc
  limit 1;
  if v_top_user is not null then
    select pa.user_id into v_holder from public.period_awards pa
    where pa.achievement_id = 'campeon_historico_clasico'
    order by pa.awarded_at desc limit 1;
    if v_holder is distinct from v_top_user then
      insert into public.period_awards (achievement_id, period_key, user_id, score)
      values ('campeon_historico_clasico', v_today, v_top_user, v_top_score)
      on conflict do nothing;
      if found then
        perform public.grant_competitive(v_top_user, 'campeon_historico_clasico', v_today);
        v_awarded := v_awarded + 1;
      end if;
    end if;
  end if;

  return jsonb_build_object('awarded', v_awarded, 'today', v_today, 'month', v_month);
end;
$$;

-- ── Fusión de un usuario anónimo en una cuenta existente (SPEC §7) ──────────
create or replace function public.merge_users(p_from uuid, p_to uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_games integer;
begin
  if p_from = p_to then raise exception 'same_user' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_from and is_anonymous) then
    raise exception 'source_not_anonymous' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_to) then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;

  update public.games set user_id = p_to where user_id = p_from;
  get diagnostics v_games = row_count;

  insert into public.leaderboard_entries (user_id, mode, period_type, period_key, best_score, game_id, achieved_at)
  select p_to, e.mode, e.period_type, e.period_key, e.best_score, e.game_id, e.achieved_at
  from public.leaderboard_entries e where e.user_id = p_from
  on conflict (mode, period_type, period_key, user_id) do update
    set best_score = excluded.best_score, game_id = excluded.game_id, achieved_at = excluded.achieved_at
    where excluded.best_score > public.leaderboard_entries.best_score
       or (excluded.best_score = public.leaderboard_entries.best_score and excluded.achieved_at < public.leaderboard_entries.achieved_at);
  delete from public.leaderboard_entries where user_id = p_from;

  insert into public.user_achievements (user_id, achievement_id, first_unlocked_at, last_unlocked_at, times_won, last_period_key, last_game_id)
  select p_to, ua.achievement_id, ua.first_unlocked_at, ua.last_unlocked_at, ua.times_won, ua.last_period_key, ua.last_game_id
  from public.user_achievements ua where ua.user_id = p_from
  on conflict (user_id, achievement_id) do update
    set first_unlocked_at = least(public.user_achievements.first_unlocked_at, excluded.first_unlocked_at),
        last_unlocked_at = greatest(public.user_achievements.last_unlocked_at, excluded.last_unlocked_at),
        times_won = public.user_achievements.times_won + excluded.times_won;
  delete from public.user_achievements where user_id = p_from;

  update public.period_awards set user_id = p_to where user_id = p_from;
  delete from public.profiles where id = p_from;

  return jsonb_build_object('moved_games', v_games);
end;
$$;

-- ── Permisos de ejecución ───────────────────────────────────────────────────
revoke execute on function public.refresh_consonant_patterns() from public, anon, authenticated;
revoke execute on function public.import_words_batch(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.import_words_finalize(uuid) from public, anon, authenticated;
revoke execute on function public.dictionary_snapshot() from public, anon, authenticated;
revoke execute on function public.start_game(uuid, public.game_mode, bigint, jsonb) from public, anon, authenticated;
revoke execute on function public.get_game_for_submit(uuid) from public, anon, authenticated;
revoke execute on function public.finalize_game(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.grant_competitive(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.award_period_champions(timestamptz) from public, anon, authenticated;
revoke execute on function public.merge_users(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_updated() from public, anon, authenticated;

grant execute on function public.refresh_consonant_patterns() to service_role;
grant execute on function public.import_words_batch(uuid, jsonb) to service_role;
grant execute on function public.import_words_finalize(uuid) to service_role;
grant execute on function public.dictionary_snapshot() to service_role;
grant execute on function public.start_game(uuid, public.game_mode, bigint, jsonb) to service_role;
grant execute on function public.get_game_for_submit(uuid) to service_role;
grant execute on function public.finalize_game(uuid, uuid, jsonb) to service_role;
grant execute on function public.grant_competitive(uuid, text, text) to service_role;
grant execute on function public.award_period_champions(timestamptz) to service_role;
grant execute on function public.merge_users(uuid, uuid) to service_role;

revoke execute on function public.get_leaderboard(public.game_mode, public.period_type, text, integer) from public;
revoke execute on function public.get_my_leaderboard_position(public.game_mode, public.period_type, text) from public;
grant execute on function public.get_leaderboard(public.game_mode, public.period_type, text, integer) to anon, authenticated, service_role;
grant execute on function public.get_my_leaderboard_position(public.game_mode, public.period_type, text) to authenticated, service_role;
