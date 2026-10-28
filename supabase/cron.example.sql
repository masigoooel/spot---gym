-- jadwal cron setelah hosting (SPEC §9): supabase memanggil /api/cron tiap 30 detik.
-- ganti <ALAMAT_APP> (mis. https://spot-gym.vercel.app) dan <CRON_SECRET> (sama dengan env di vercel),
-- lalu jalankan sekali di SQL Editor supabase. bukan migration: isinya rahasia, jangan di-commit setelah diisi.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- jalankan ulang file ini aman: jadwal lama dengan nama yang sama diganti
select cron.unschedule('spot-cron') where exists (select 1 from cron.job where jobname = 'spot-cron');

select cron.schedule(
  'spot-cron',
  '30 seconds',
  $$
  select net.http_get(
    url := '<ALAMAT_APP>/api/cron',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'),
    timeout_milliseconds := 30000
  );
  $$
);

-- cek: select * from cron.job_run_details order by start_time desc limit 5;
-- berhenti: select cron.unschedule('spot-cron');
