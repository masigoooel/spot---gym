-- 28 okt: pengingat istirahat disimpan di database (bukan timer di memori),
-- supaya tetap jalan saat bot pindah ke webhook di vercel (SPEC §5.10).
-- satu baris per chat: dibuat saat set dicatat, dikirim oleh cron saat due_at lewat,
-- dihapus (beserta pesannya) begitu user menekan / mengetik apa pun.
create table if not exists rest_reminders (
  chat_id          bigint primary key,
  user_id          uuid not null references users(id) on delete cascade,
  due_at           timestamptz not null,
  card_message_id  bigint not null,         -- dikirim hanya kalau kartu aktif masih ini
  set_order        int not null,            -- … dan draft masih set yang sama (belum ada set baru)
  exercise_name    text not null,
  message_id       bigint                   -- null = belum dikirim, 0 = sedang dikirim, >0 = pesan pengingat
);
create index if not exists rest_reminders_due on rest_reminders (due_at) where message_id is null;

alter table rest_reminders enable row level security;
