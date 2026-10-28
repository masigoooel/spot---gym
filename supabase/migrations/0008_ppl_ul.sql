-- 27 okt (8): program gabungan push pull legs + upper lower (push → pull → legs → upper → lower).
alter table user_settings drop constraint if exists user_settings_program_check;
alter table user_settings
  add constraint user_settings_program_check check (program in ('ppl','upper_lower','ppl_ul','full_body','bebas'));
