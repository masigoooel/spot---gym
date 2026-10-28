-- supabase/migrations/0003_bot_aktif.sql — perubahan SPEC v0.1 (bot aktif, template per split, streak + jatah libur)

-- ---------- pengaturan user ----------
alter table user_settings
  add column program        text not null default 'ppl' check (program in ('ppl','upper_lower','full_body','bebas')),
  add column reminder_time  time not null default '17:00',   -- jam bot nanya "hari ini push. siap?"
  add column chattiness     text not null default 'aktif' check (chattiness in ('aktif','seperlunya')),
  add column rest_allowance int  not null default 1 check (rest_allowance between 0 and 7);  -- jatah libur per minggu

-- ---------- latihan ----------
alter table exercises
  add column muscle       text,                            -- 'dada' | 'punggung' | 'bahu' | 'kaki' | 'lengan' | 'perut'
  add column equipment    text,                            -- 'barbel' | 'dumbel' | 'mesin' | 'kabel' | 'berat badan'
  add column alternatives text[] not null default '{}',    -- slug pengganti kalau alat dipakai orang
  add column merged_into  int references exercises(id);    -- latihan pribadi yang digabung ke latihan bawaan

-- baris lama diisi '—' dulu; latihan bawaan ditimpa nilai aslinya oleh seed.sql
update exercises set muscle = '—' where muscle is null;
update exercises set equipment = '—' where equipment is null;
alter table exercises alter column muscle set not null, alter column equipment set not null;

-- daftar latihan yang ditawarkan bot per split (user_id null = template bawaan)
create table split_templates (
  id           serial primary key,
  user_id      uuid references users(id) on delete cascade,
  split        text not null,                                -- 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full'
  exercise_id  int  not null references exercises(id),
  position     int  not null default 0
);
create index on split_templates (user_id, split, position);

-- status hari: libur, jadwal digeser, atau kelewat
create table day_status (
  user_id   uuid not null references users(id) on delete cascade,
  day       date not null,
  status    text not null check (status in ('libur','geser','kelewat')),
  reason    text,
  primary key (user_id, day)
);

-- ---------- sesi & set ----------
alter table workout_sessions
  add column feel      text check (feel in ('ringan','pas','berat')),  -- jawaban "gimana rasanya hari ini?"
  add column backdated boolean not null default false;                 -- dicatat lewat /kemarin

alter table sets
  add column is_drop   boolean not null default false,  -- drop set (lanjut tanpa istirahat)
  add column set_order int not null default 1;          -- urutan set latihan ini di sesi

-- ---------- ingatan bot (tidak ada di SPEC; dibutuhkan supaya tetap jalan saat pindah ke webhook) ----------

-- percakapan yang sedang berjalan, satu baris per user
create table bot_state (
  user_id            uuid primary key references users(id) on delete cascade,
  focus_exercise_id  int references exercises(id),   -- latihan yang sedang dikerjakan (buat set tanpa nama)
  awaiting           text,                            -- bot menunggu ketikan: 'nama' | 'rep' | 'beban'
  awaiting_data      jsonb not null default '{}',
  backdate           boolean not null default false,  -- /kemarin: set berikutnya masuk ke kemarin
  updated_at         timestamptz not null default now()
);

-- tombol yang sudah dipakai (callback idempotent: ditekan dua kali tetap dicatat sekali)
create table used_buttons (
  chat_id     bigint not null,
  message_id  bigint not null,
  used_at     timestamptz not null default now(),
  primary key (chat_id, message_id)
);

-- penanda pesan terjadwal yang sudah dikirim (pengingat, "kemarin kelewat", rekap mingguan)
create table bot_daily (
  user_id  uuid not null references users(id) on delete cascade,
  day      date not null,
  kind     text not null check (kind in ('pengingat','kelewat','rekap_mingguan')),
  primary key (user_id, day, kind)
);

alter table split_templates enable row level security;
alter table day_status      enable row level security;
alter table bot_state       enable row level security;
alter table used_buttons    enable row level security;
alter table bot_daily       enable row level security;
