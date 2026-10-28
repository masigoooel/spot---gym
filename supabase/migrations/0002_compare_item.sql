-- benda setara yang dipakai di rekap sesi ini (id dari ITEMS di lib/setara.ts).
-- dipakai /setara dan supaya rekap berikutnya tidak memakai benda yang sama.
alter table workout_sessions add column compare_item text;
