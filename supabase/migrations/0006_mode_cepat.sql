-- 27 okt (3): alias pribadi. teks yang diketik user lalu dipastikan lewat tombol "maksudnya …?"
-- disimpan (sudah dinormalisasi), jadi lain kali langsung dikenali tanpa ditanya.
create table if not exists user_aliases (
  user_id      uuid not null references users(id) on delete cascade,
  alias        text not null,
  exercise_id  int  not null references exercises(id) on delete cascade,
  primary key (user_id, alias)
);
alter table user_aliases enable row level security;

-- 27 okt (4) & (5): kartu latihan (mode cepat) dan latihan coba.
-- angka di kartu dibaca dari draft, jadi data tombol tidak perlu membawa angka.
alter table bot_state
  add column if not exists card_message_id bigint,          -- kartu yang masih aktif (tombol di kartu lain diabaikan)
  add column if not exists draft jsonb,                     -- angka di kartu: exercise_id, beban, rep, durasi, jarak, …
  add column if not exists practice jsonb,                  -- latihan coba (tidak disimpan ke sets)
  add column if not exists menu_version int not null default 0;  -- menu bawah versi berapa yang sudah dipasang
