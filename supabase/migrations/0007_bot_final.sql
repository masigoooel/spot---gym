-- 27 okt (7): state bot sesuai SPEC §5.10.
alter table bot_state
  add column if not exists skipped_exercise_ids int[] not null default '{}',  -- latihan yang dilewati di sesi ini (tidak ditawarkan lagi otomatis)
  add column if not exists last_deleted_set_id uuid,                          -- set yang barusan dihapus (untuk [↩️ urungkan])
  add column if not exists sessions_done int not null default 0,              -- sesi nyata yang sudah selesai (baris 💡 hanya di 3 sesi pertama)
  add column if not exists compact_messages jsonb not null default '{}';      -- baris padat per latihan di sesi ini (supaya tiap latihan cuma satu baris)

-- user lama: hitung sesi yang sudah selesai
update bot_state b
set sessions_done = (
  select count(*) from workout_sessions w
  where w.user_id = b.user_id and w.set_count > 0 and w.ended_at is not null and w.deleted_at is null
);
