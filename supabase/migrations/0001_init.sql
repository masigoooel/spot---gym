-- supabase/migrations/0001_init.sql
create extension if not exists "pgcrypto";

create table users (
  id            uuid primary key default gen_random_uuid(),
  telegram_id   bigint unique not null,
  username      text,
  display_name  text,
  timezone      text not null default 'Asia/Jakarta',
  created_at    timestamptz not null default now()
);

create table user_settings (
  user_id         uuid primary key references users(id) on delete cascade,
  weekly_target   int  not null default 5 check (weekly_target between 1 and 7),
  unit            text not null default 'kg' check (unit in ('kg','lb')),
  compare_mode    text not null default 'auto' check (compare_mode in ('auto','lock')),
  compare_item    text not null default 'mobil',
  notify_pr       boolean not null default true,
  notify_weekly   boolean not null default true,
  notify_schedule boolean not null default true,
  auto_story      boolean not null default true,
  -- hari (1=senin … 7=minggu) -> split
  split_schedule  jsonb not null default '{"1":"pull","2":"legs","4":"push"}'
);

create table exercises (
  id             serial primary key,
  slug           text unique not null,          -- 'bench-press'
  name           text not null,                 -- 'bench press'
  aliases        text[] not null default '{}',  -- {'bench','bp'}
  is_bodyweight  boolean not null default false,
  user_id        uuid references users(id) on delete cascade  -- null = latihan bawaan
);

create table workout_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  split         text,                            -- 'push' | 'pull' | 'legs' | bebas
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,                     -- null = sesi masih jalan
  total_volume  numeric(10,2) not null default 0,
  set_count     int not null default 0
);
create index on workout_sessions (user_id, started_at desc);

create table sets (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references workout_sessions(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  exercise_id   int  not null references exercises(id),
  weight_kg     numeric(6,2),                    -- null = berat badan
  is_added      boolean not null default false,  -- true = beban tambahan (+10 pull-up)
  reps          int not null check (reps > 0),
  failed        boolean not null default false,  -- rep terakhir gagal
  raw_text      text,                            -- pesan asli dari telegram
  created_at    timestamptz not null default now()
);
create index on sets (user_id, exercise_id, created_at desc);

create table personal_records (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  exercise_id        int  not null references exercises(id),
  set_id             uuid not null references sets(id) on delete cascade,
  weight_kg          numeric(6,2) not null,
  reps               int not null,
  e1rm               numeric(6,2),
  previous_weight_kg numeric(6,2),
  achieved_at        timestamptz not null default now()
);
create index on personal_records (user_id, exercise_id, achieved_at desc);

create table login_tokens (
  token        text primary key,        -- acak, minimal 32 karakter
  user_id      uuid not null references users(id) on delete cascade,
  expires_at   timestamptz not null,    -- dibuat + 10 menit
  used_at      timestamptz              -- sekali pakai
);

-- semua akses lewat server (service role). rls aktif tanpa policy,
-- jadi kunci anon tidak bisa baca/tulis apa pun.
alter table users            enable row level security;
alter table user_settings    enable row level security;
alter table exercises        enable row level security;
alter table workout_sessions enable row level security;
alter table sets             enable row level security;
alter table personal_records enable row level security;
alter table login_tokens     enable row level security;
