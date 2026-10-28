-- supabase/migrations/0004_durasi_hapus.sql — perubahan SPEC: latihan durasi/kardio, hapus & urungkan (soft delete)

-- ---------- jenis latihan ----------
alter table exercises
  add column kind       text not null default 'beban' check (kind in ('beban','durasi','kardio')),
  add column deleted_at timestamptz;                          -- latihan pribadi yang dihapus

-- ---------- set durasi & kardio ----------
alter table sets alter column reps drop not null;             -- null untuk latihan durasi/kardio
alter table sets
  add column duration_sec int check (duration_sec > 0),       -- plank 60 detik, treadmill 1200 detik
  add column distance_m   int check (distance_m > 0),         -- opsional untuk kardio
  add column deleted_at   timestamptz;
alter table sets add constraint sets_ada_isinya check (reps is not null or duration_sec is not null or distance_m is not null);

-- ---------- hapus & urungkan ----------
alter table workout_sessions add column deleted_at timestamptz;
alter table users            add column delete_requested_at timestamptz;   -- hapus akun: permanen setelah 7 hari

-- baris yang dihapus dibersihkan permanen setelah 30 hari; index supaya job hariannya ringan
create index on sets (deleted_at) where deleted_at is not null;
create index on workout_sessions (deleted_at) where deleted_at is not null;
create index on sets (session_id);
