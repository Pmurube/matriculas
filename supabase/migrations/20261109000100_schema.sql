-- Matrículas · 0001 · Esquema base (SPEC.md §8)
-- Tablas, enums, restricciones, índices y timestamps.

-- gen_random_uuid() es nativo desde PostgreSQL 13.

-- ── Enums ────────────────────────────────────────────────────────────────────
create type public.game_mode as enum ('contrarreloj', 'clasico', 'combo_vocales');
create type public.game_status as enum ('active', 'finished', 'rejected', 'expired');
create type public.round_outcome as enum ('solved', 'passed');
create type public.word_status as enum ('active', 'blocked');
create type public.achievement_kind as enum ('progress', 'competitive');
create type public.period_type as enum ('daily', 'monthly', 'alltime');

-- ── Utilidad: updated_at ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── profiles ─────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  alias text not null
    constraint profiles_alias_format check (
      char_length(alias) between 3 and 20
      and alias ~ '^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _-]+$'
      and alias = btrim(alias)
    ),
  is_anonymous boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_alias_lower_key on public.profiles (lower(alias));
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── words ────────────────────────────────────────────────────────────────────
create table public.words (
  id bigint generated always as identity primary key,
  word text not null unique
    constraint words_word_length check (char_length(word) between 1 and 30),
  plain_key text not null,
  pattern text not null
    constraint words_pattern_length check (char_length(pattern) = 3),
  letters smallint not null constraint words_letters_positive check (letters > 0),
  status public.word_status not null default 'active',
  flags text[] not null default '{}',
  source_row integer,
  import_run uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index words_pattern_active_idx on public.words (pattern) where status = 'active';
create index words_plain_key_idx on public.words (plain_key);
create trigger words_updated_at before update on public.words
  for each row execute function public.set_updated_at();

-- ── consonant_patterns (matrículas seleccionables) ───────────────────────────
create table public.consonant_patterns (
  pattern text primary key constraint consonant_patterns_length check (char_length(pattern) = 3),
  solutions_count integer not null constraint consonant_patterns_has_solutions check (solutions_count > 0),
  updated_at timestamptz not null default now()
);

-- ── games ────────────────────────────────────────────────────────────────────
create table public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode public.game_mode not null,
  status public.game_status not null default 'active',
  seed bigint not null,
  plates jsonb not null constraint games_plates_array check (jsonb_typeof(plates) = 'array'),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score integer constraint games_score_nonneg check (score >= 0),
  solved_count smallint constraint games_solved_nonneg check (solved_count >= 0),
  passed_count smallint constraint games_passed_nonneg check (passed_count >= 0),
  best_word text,
  best_combo smallint constraint games_best_combo_nonneg check (best_combo >= 0),
  client_elapsed_ms integer,
  server_elapsed_ms integer,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_finished_has_score check (status <> 'finished' or score is not null),
  constraint games_rejected_has_reason check (status <> 'rejected' or rejection_reason is not null)
);
create index games_user_started_idx on public.games (user_id, started_at desc);
create index games_active_idx on public.games (started_at) where status = 'active';
create trigger games_updated_at before update on public.games
  for each row execute function public.set_updated_at();

-- ── game_rounds ──────────────────────────────────────────────────────────────
create table public.game_rounds (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  round_index smallint not null constraint game_rounds_index_nonneg check (round_index >= 0),
  pattern text not null constraint game_rounds_pattern_length check (char_length(pattern) = 3),
  challenge text,
  outcome public.round_outcome not null,
  word text,
  points smallint not null default 0 constraint game_rounds_points_nonneg check (points >= 0),
  vowel_points smallint not null default 0,
  length_bonus smallint not null default 0,
  rare_bonus smallint not null default 0,
  combo_bonus smallint not null default 0,
  challenge_bonus smallint not null default 0,
  failed_attempts smallint not null default 0,
  at_ms integer not null default 0,
  created_at timestamptz not null default now(),
  constraint game_rounds_unique unique (game_id, round_index),
  constraint game_rounds_solved_has_word check (outcome = 'passed' or word is not null)
);

-- ── leaderboard_entries (mejor puntuación por usuario/modo/periodo) ──────────
create table public.leaderboard_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode public.game_mode not null,
  period_type public.period_type not null,
  period_key text not null,
  best_score integer not null constraint leaderboard_score_nonneg check (best_score >= 0),
  game_id uuid references public.games (id) on delete set null,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leaderboard_unique unique (mode, period_type, period_key, user_id),
  constraint leaderboard_mode_period check (
    (mode = 'contrarreloj' and period_type in ('daily', 'monthly'))
    or (mode = 'clasico' and period_type in ('daily', 'alltime'))
  )
);
create index leaderboard_rank_idx
  on public.leaderboard_entries (mode, period_type, period_key, best_score desc, achieved_at asc);
create index leaderboard_user_idx on public.leaderboard_entries (user_id);
create trigger leaderboard_updated_at before update on public.leaderboard_entries
  for each row execute function public.set_updated_at();

-- ── achievements ─────────────────────────────────────────────────────────────
create table public.achievements (
  id text primary key constraint achievements_slug check (id ~ '^[a-z_]+$'),
  name text not null,
  description text not null,
  kind public.achievement_kind not null,
  config jsonb not null default '{}'::jsonb,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger achievements_updated_at before update on public.achievements
  for each row execute function public.set_updated_at();

-- ── user_achievements (no acumulables: PK compuesta) ─────────────────────────
create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  first_unlocked_at timestamptz not null default now(),
  last_unlocked_at timestamptz not null default now(),
  times_won integer not null default 1 constraint user_achievements_times_positive check (times_won >= 1),
  last_period_key text,
  last_game_id uuid references public.games (id) on delete set null,
  primary key (user_id, achievement_id)
);

-- ── rare_consonant_config (bonus editable; vacío o 0 = sin bonus) ────────────
create table public.rare_consonant_config (
  consonant text primary key
    constraint rare_consonant_valid check (consonant in ('b','c','d','f','g','h','j','k','l','m','n','ñ','p','q','r','s','t','v','w','x','y','z')),
  bonus smallint not null default 0 constraint rare_consonant_bonus_range check (bonus between 0 and 10),
  updated_at timestamptz not null default now()
);
create trigger rare_consonant_config_updated_at before update on public.rare_consonant_config
  for each row execute function public.set_updated_at();

-- ── period_awards (registro idempotente de campeones por periodo) ────────────
create table public.period_awards (
  achievement_id text not null references public.achievements (id) on delete cascade,
  period_key text not null,
  user_id uuid references public.profiles (id) on delete set null,
  score integer,
  awarded_at timestamptz not null default now(),
  primary key (achievement_id, period_key)
);

-- ── Perfil automático al crear usuario (anónimo o con email) ────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_try int := 0;
begin
  loop
    begin
      insert into public.profiles (id, alias, is_anonymous)
      values (
        new.id,
        'Conductor-' || upper(substr(md5(new.id::text || v_try::text || clock_timestamp()::text), 1, 6)),
        coalesce(new.is_anonymous, false)
      )
      on conflict (id) do nothing;
      return new;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 5 then raise; end if;
    end;
  end loop;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Al convertir un anónimo en cuenta permanente (mismo id) se actualiza el flag.
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(old.is_anonymous, false) is distinct from coalesce(new.is_anonymous, false) then
    update public.profiles set is_anonymous = coalesce(new.is_anonymous, false) where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of is_anonymous on auth.users
  for each row execute function public.handle_user_updated();
