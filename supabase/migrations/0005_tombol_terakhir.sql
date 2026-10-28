-- (tidak dipakai lagi) pesan bot terakhir yang masih punya tombol "set lagi / beban turun / latihan lain".
-- sejak mode cepat (0006) set dicatat di satu kartu yang diedit di tempat, jadi kolom ini tidak dibaca lagi.
alter table bot_state add column if not exists buttons_message_id bigint;
