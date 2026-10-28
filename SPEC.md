# spot. — spesifikasi teknis v0.1

> kamu angkat. aku jagain.

Gym log yang dicatat lewat bot Telegram, lalu dirangkum jadi dashboard web.
Desain lengkap ada di canvas "spot." (Claude). Dokumen ini adalah acuan untuk ngoding.

## Catatan perubahan

- **28 okt (3)** — **hosting di vercel** (5.10, 9, 10): webhook `/api/telegram`, cron `pg_cron` → `/api/cron` tiap 30 detik, pengingat istirahat pindah ke tabel `rest_reminders` (migration `0009`), `npm run webhook`, region `hnd1`, env `TELEGRAM_WEBHOOK_SECRET` & `CRON_SECRET`.
- **28 okt (2)** — **pengingat istirahat** (5.5, 5.9, 5.10, 5.11): 90 detik setelah set dicatat dan user diam, bot kirim satu pesan pendek supaya hp bunyi; pesannya dihapus begitu user menekan / mengetik apa pun. Awalnya timer di memori proses bot; sejak 28 okt (3) disimpan di database. Skenario uji 17.
- **28 okt** — **latihan hari ini dari template bawaan cuma 5** (5.5, 5.11): user yang belum punya riwayat split itu (dan belum mengatur template sendiri) tidak lagi dapat "hari ini ada 10 latihan"; yang dihitung cuma 5 teratas, daftar pilihan tetap 10. "latihan 2 dari 5" sekarang mengikuti urutan dikerjakan, bukan posisi di template. Teks skenario 14 disamakan ("masih ada n yang belum"). Skenario uji 16.
- **27 okt (13)** — **latihan berikutnya dipilih sendiri** (5.3, 5.5, 5.11): tombol jadi `[➡️ latihan berikutnya]` tanpa nama latihan; ditekan → kartu jadi daftar latihan hari ini (tanpa latihan sekarang) + `[🔍 cari latihan lain] [‹ kembali ke kartu]`, atau ketik nama latihannya. "3 set beres" bertanya "lanjut latihan apa?". Bot tidak lagi menyodorkan satu latihan tertentu.
- **27 okt (12)** — **latihan dipilih sendiri** (5.2, 5.5, 5.8, 5.11): sesi tanpa set + `🏋️ kartu latihan` = pilih ulang dari awal; setelah split dipilih, bot tidak langsung mengirim kartu latihan pertama, tapi daftar latihan rekomendasi split itu (maks. 10, 2 kolom) + `[🔍 cari latihan lain] [‹ ganti split]`; latihan yang dipilih jadi kartu. Ganti split di tengah sesi juga berakhir di daftar ini (+ `‹ kembali ke kartu`).
- **27 okt (11)** — **jadwal cuma saran + cara pakai di awal** (5.2, 5.3, 5.5, 5.8, 5.10, 5.11): `🏋️ kartu latihan` tanpa sesi → tanya dulu mau latihan apa (split jadwal paling atas, split lain tetap bisa); `🔄 ganti latihan` → `📅 ganti split hari ini`; pesan perkenalan berisi cara pakai, pesan jadwal setelahnya, tur terpisah dihapus. Skenario uji 15.
- **27 okt (10)** — **karakter bot: spotter** (5, 5.3, 5.8, 5.9): bot bernama spotter dari spot., ramah, enerjik, suka membantu. Pesan kenalan dibuka dengan perkenalan diri + apa yang dibantu, baru tawaran jadwal. Nama & deskripsi bot di telegram disetel otomatis saat bot jalan.
- **27 okt (9)** — **bot lebih interaktif** (langsung di bagian 5): sapaan pakai nama, langkah atur sendiri bernomor + `‹ kembali` + pratinjau jadwal (5.3); kartu pertama mengajak mulai, reaksi setelah tiap ✅ catat, "tinggal n latihan lagi" (5.5); rekap membandingkan dengan sesi split yang sama + jumlah pr, penutup menyebut jadwal berikutnya (5.7). Skenario uji 14.
- **27 okt (8)** — program gabungan **ppl + upper lower** (`ppl_ul`): split push → pull → legs → upper → lower dibagi berurutan ke hari yang dipilih. Ada di kenalan bot (5.3) dan halaman profil. Migration `0008_ppl_ul.sql`.

- **27 okt (7)** — **bagian 5 (bot) ditulis ulang total jadi satu spesifikasi final.** Semua catatan bot sebelumnya sudah dilebur, yang bertentangan dibuang. Bandingkan kode dengan bagian 5 dari atas sampai bawah dan jalankan 13 skenario di 5.11. Mulai sekarang perubahan bot langsung mengubah bagian 5.

- ~~**27 okt (6)**~~ *(sudah dilebur ke bagian 5)* — **revisi hasil uji coba** (bagian 5 "Revisi hasil uji coba"): tombol `🏁 selesai latihan` selalu ada di kartu, "batal" diganti "hapus set terakhir", menu bawah jadi 2 tombol (`🏋️ kartu latihan`, `❓ bantuan`), kartu 0 set dihapus & latihan dilewati tidak ditawarkan lagi, kartu padat pakai ✅ + kg, tur singkat setelah kenalan, `/selesai` wajib membalas.
- ~~**27 okt (5)**~~ *(sudah dilebur ke bagian 5)* — **gaya bahasa v2**: kalimat lebih utuh & ramah, emoji sebagai ikon (maks. 2/pesan, daftar tetap), aturan anti-bingung (tiap pesan ada langkah berikutnya, tips 3 sesi pertama, `/bantuan` jadi menu tombol), **latihan coba** setelah kenalan, label tombol & menu baru pakai emoji, foto profil + gambar deskripsi bot di `assets/telegram/`. Ubah `lib/copy.ts`, `lib/bot/kenalan.ts`, kartu di mode cepat.
- ~~**27 okt (4)**~~ *(sudah dilebur ke bagian 5)* — **mode cepat bot** (bagian 5 "Mode cepat — kartu latihan"): satu kartu per latihan yang diedit di tempat, angka terisi dari minggu lalu (✓ catat), tombol ± beban/rep, lanjut otomatis ke latihan berikutnya, ketik cepat (`6`, `70 8`, `ok`, `-`), batal tanpa konfirmasi, satu pesan rekap, menu bawah 3 tombol, kenalan 1 pertanyaan. Refactor `lib/bot/latihan.ts`, `record.ts`, `index.ts`, `common.ts`, `copy.ts`.
- **27 okt (3)** — pencocokan nama longgar: abaikan strip/spasi/huruf besar/jamak, sinonim (dumbbell = db, machine = mesin), urutan kata bebas, typo dikonfirmasi, alias pribadi (`user_aliases`) + daftar unit test. Lihat bagian 4 "Pencocokan nama yang longgar".
- **27 okt (2)** — tambah 103 gerakan (total 268): variasi dada, punggung, bahu, lengan, kaki, bokong, perut, full body, kardio & olahraga (badminton, futsal, jalan kaki), dan kelompok baru **mobilitas**. Blok insert kedua di `seed.sql`.
- **27 okt** — tambah 4 latihan punggung: seated wide grip row, single arm cable row, reverse grip pulldown, high row mesin (total 165).
- **26 okt (4)** — daftar latihan jadi 161 di `supabase/seed.sql`; kolom `exercises.kind`, `sets.duration_sec`, `sets.distance_m`; format durasi & kardio; aturan tombol "lihat lainnya" di bot; template per split jadi 10 latihan.
- **26 okt (3)** — hapus & urungkan (soft delete, `/hapus`, tombol hapus set ini, hapus akun).
- ~~**26 okt (2)**~~ *(sudah dilebur ke bagian 5)* — bot aktif bertanya (kenalan, pengingat, tombol latihan per split, pertanyaan rasa); latihan tidak dikenal; set beban turun & drop set; `/kemarin`, `/libur`, `/geser`; streak ikut jadwal + jatah libur.
- **26 okt (1)** — versi awal; mode lokal (tanpa hosting), bot @spot_gymbot.

---

## 1. Stack

| Bagian | Pilihan | Catatan |
|---|---|---|
| Web | Next.js (App Router) + TypeScript + Tailwind CSS | satu repo untuk web + bot |
| Database | Supabase (Postgres) | akses dari server pakai service role |
| Bot | grammY (Node.js, TypeScript) | **sekarang:** long polling, jalan lokal pakai `npm run bot`. **nanti saat hosting:** webhook di `/api/telegram` |
| Login web | link masuk sekali pakai dari bot (`/masuk`) | sesi web disimpan di cookie terenkripsi |
| Gambar story | `next/og` (ImageResponse) 1080×1920 | route `/api/story/[sessionId]` |
| Hosting | **nanti** (rencana Vercel) | untuk sekarang semua jalan di `localhost` |

**Mode lokal dulu.** Selama belum hosting, web jalan di `http://localhost:3000` (`npm run dev`) dan bot jalan di terminal terpisah (`npm run bot`) pakai long polling, jadi tidak butuh URL publik. Kode handler bot ditulis sekali di `lib/bot/`, lalu dipanggil dari `bot/dev.ts` (polling) sekarang dan dari `/api/telegram` (webhook) nanti.

**Login tanpa domain.** Telegram Login Widget butuh domain asli, jadi untuk sekarang login pakai link dari bot: user kirim `/masuk` → bot balas link `http://localhost:3000/masuk?token=…` (berlaku 10 menit, sekali pakai) → web cek token, buat cookie sesi. Login Widget bisa ditambah nanti setelah hosting.

Kenapa satu repo: bot dan web pakai database dan logika yang sama (parser, hitung volume, deteksi PR), jadi cukup ditulis sekali di `lib/`.

---

## 2. Struktur folder (usulan)

```
app/
  (publik)/page.tsx              landing
  masuk/page.tsx                 login & hubungkan bot
  dashboard/page.tsx             ringkasan
  dashboard/progres/page.tsx
  dashboard/riwayat/page.tsx
  dashboard/riwayat/[id]/page.tsx
  dashboard/pr/page.tsx
  dashboard/profil/page.tsx
  bagikan/[sessionId]/page.tsx   bagikan ke story
  api/telegram/route.ts          webhook bot (nanti, saat hosting)
  api/story/[sessionId]/route.tsx  gambar story (next/og)
bot/
  dev.ts                         jalankan bot lokal (long polling): npm run bot
lib/
  db.ts                          klien supabase (server)
  parser.ts                      pembaca pesan set
  workout.ts                     volume, e1RM, PR, streak
  setara.ts                      daftar benda & pemilih otomatis
  bot/                           handler perintah grammY
  copy.ts                        semua teks balasan bot (gaya bahasa spot.)
components/
  Logo.tsx  Ilustrasi.tsx  ...
supabase/
  migrations/0001_init.sql
  seed.sql                       daftar latihan + alias
```

---

## 3. Database

Semua berat disimpan dalam **kg** (konversi ke lb hanya saat ditampilkan).
Waktu disimpan `timestamptz`; tampilan pakai zona `Asia/Jakarta`.

```sql
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
  program         text not null default 'ppl' check (program in ('ppl','upper_lower','ppl_ul','full_body','bebas')),  -- ppl_ul = push → pull → legs → upper → lower
  -- hari (1=senin … 7=minggu) -> split
  split_schedule  jsonb not null default '{"1":"pull","2":"legs","4":"push"}',
  reminder_time   time not null default '17:00',   -- jam bot nanya "hari ini push. siap?"
  chattiness      text not null default 'aktif' check (chattiness in ('aktif','seperlunya')),
  rest_allowance  int  not null default 1          -- jatah libur per minggu yang tidak memutus streak
);

-- daftar latihan yang ditawarkan bot per split (bisa diubah user di web)
create table split_templates (
  id           serial primary key,
  user_id      uuid references users(id) on delete cascade,  -- null = template bawaan
  split        text not null,                                -- 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full'
  exercise_id  int  not null references exercises(id),
  position     int  not null default 0
);

-- status hari: libur atau jadwal digeser
create table day_status (
  user_id   uuid not null references users(id) on delete cascade,
  day       date not null,
  status    text not null check (status in ('libur','geser','kelewat')),
  reason    text,                                            -- 'sakit', 'sibuk', bebas
  primary key (user_id, day)
);

create table exercises (
  id             serial primary key,
  slug           text unique not null,          -- 'bench-press'
  name           text not null,                 -- 'bench press'
  aliases        text[] not null default '{}',  -- {'bench','bp'}
  muscle         text not null,                 -- lihat daftar otot di seed (dada, punggung, bahu, bisep, trisep, … kardio)
  equipment      text not null,                 -- barbel | dumbel | mesin | kabel | smith | ez-bar | trap bar | landmine | kettlebell | berat badan | sled | alat lain
  kind           text not null default 'beban' check (kind in ('beban','durasi','kardio')),
  alternatives   text[] not null default '{}',  -- slug pengganti kalau alat dipakai orang
  is_bodyweight  boolean not null default false,
  user_id        uuid references users(id) on delete cascade,  -- null = latihan bawaan, isi = latihan pribadi user
  merged_into    int references exercises(id)   -- kalau latihan pribadi digabung ke latihan bawaan
);

create table workout_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  split         text,                            -- 'push' | 'pull' | 'legs' | bebas
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,                     -- null = sesi masih jalan
  total_volume  numeric(10,2) not null default 0,
  set_count     int not null default 0,
  feel          text check (feel in ('ringan','pas','berat')),  -- jawaban "gimana rasanya hari ini?"
  backdated     boolean not null default false                  -- dicatat lewat /kemarin
);
create index on workout_sessions (user_id, started_at desc);

create table sets (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references workout_sessions(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  exercise_id   int  not null references exercises(id),
  weight_kg     numeric(6,2),                    -- null = berat badan
  is_added      boolean not null default false,  -- true = beban tambahan (+10 pull-up)
  reps          int check (reps > 0),            -- null untuk latihan durasi/kardio
  duration_sec  int check (duration_sec > 0),    -- plank 60 detik, treadmill 1200 detik
  distance_m    int check (distance_m > 0),      -- opsional untuk kardio
  failed        boolean not null default false,  -- rep terakhir gagal
  is_drop       boolean not null default false,  -- drop set (lanjut tanpa istirahat dari set sebelumnya)
  set_order     int not null default 1,          -- urutan set dalam latihan ini di sesi
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
```

### Hapus (soft delete)

Data tidak langsung dihapus permanen, supaya tombol **urungkan** bisa jalan.

```sql
alter table workout_sessions add column deleted_at timestamptz;
alter table sets             add column deleted_at timestamptz;
alter table exercises        add column deleted_at timestamptz;   -- latihan pribadi
alter table users            add column delete_requested_at timestamptz;
```

- Semua query tampilan wajib `where deleted_at is null`.
- Hapus sesi = isi `deleted_at` di sesi **dan** semua set-nya. Urungkan = kosongkan lagi.
- Hapus latihan pribadi = set-setnya dipindah ke latihan `lain`, lalu latihan diberi `deleted_at`.
- Baris dengan `deleted_at` lebih dari **30 hari** dihapus permanen (job harian).
- Hapus akun: isi `delete_requested_at`; akun + semua data dihapus permanen setelah **7 hari**. Selama 7 hari itu, kirim apa pun ke bot → *akunmu dijadwalkan dihapus tanggal X.* `[↩️ jangan hapus akunku]`.
- Setiap hapus/urungkan **menghitung ulang**: `total_volume` & `set_count` sesi, PR latihan terkait (PR mundur ke rekor sebelumnya kalau set PR dihapus), streak, dan rekap minggu.

**Keamanan:** semua query lewat server (route handler / server action) pakai service role, dan selalu difilter `user_id` dari sesi login. Aktifkan RLS di semua tabel tanpa policy publik, supaya kunci anon tidak bisa baca apa pun.

### Seed latihan (contoh)

Data lengkap ada di **`supabase/seed.sql`** — **268 latihan**, masing-masing dengan alias (singkatan & bahasa sehari-hari), otot, alat, jenis, dan latihan pengganti.

| otot | jumlah | contoh |
|---|---|---|
| dada | 28 | bench press, incline db press, chest press, floor press, pec deck, cable fly, svend press, dips |
| punggung | 40 | deadlift, pull-up, lat pulldown, close-grip pulldown, barbell row, yates row, kroc row, seated wide grip row, cable pullover, shrug |
| bahu | 27 | overhead press, z press, arnold press, lateral raise, leaning lateral raise, lu raise, face pull, band pull apart |
| bisep | 20 | barbell curl, hammer curl, preacher curl, bayesian curl, zottman curl, 21s |
| trisep | 19 | tricep pushdown, skull crusher, overhead extension, tate press, katana extension, jm press |
| lengan bawah | 8 | wrist curl, farmer walk, dead hang, plate pinch, wrist roller |
| paha depan | 29 | squat, hack squat, pendulum squat, ssb squat, leg press, bulgarian split squat, cossack squat, leg extension |
| paha belakang | 13 | romanian deadlift, lying/seated/standing leg curl, nordic curl, glute ham raise |
| bokong | 14 | hip thrust, glute bridge, frog pump, hip abduction, cable kickback, band lateral walk |
| betis | 7 | standing/seated calf raise, donkey calf raise, tibialis raise |
| perut | 26 | plank, cable crunch, hanging leg raise, ab wheel, dragon flag, l-sit |
| full body | 15 | kettlebell swing, power clean, clean and jerk, box jump, wall ball, sled push |
| kardio & olahraga | 18 | treadmill, incline walk, sepeda statis, rowing, stairmaster, lompat tali, jalan kaki, badminton, futsal |
| mobilitas | 3 | peregangan, foam rolling, yoga |
| lain | 1 | latihan lain |

Referensi daftar gerakan: database terbuka wger.de / exercemus (CC-BY-SA 3.0) dan panduan latihan umum; nama, alias, dan pengelompokan disusun ulang sendiri. Kalau nanti mau impor data lengkap mereka (deskripsi, gambar), wajib cantumkan atribusi & lisensi per latihan.

**Jenis latihan (`kind`):**
- `beban` — beban × rep (beban kosong = berat badan, `+10` = beban tambahan)
- `durasi` — detik (plank, side plank, wall sit, dead hang)
- `kardio` — menit, jarak opsional (treadmill, lari, sepeda, …)

**Alat (`equipment`):** barbel, dumbel, mesin, kabel, smith, ez-bar, trap bar, landmine, kettlebell, berat badan, sled, alat lain.

**Aturan alias:** parser memakai alias **terpanjang** yang cocok, jadi `leg press 100x10` → leg press (bukan overhead press lewat alias `press`).

### Template bawaan per split (10 latihan, urut)

| split | latihan yang ditawarkan bot |
|---|---|
| push | bench press, incline db press, overhead press, chest press, dips, cable fly, lateral raise, tricep pushdown, overhead tricep extension, pec deck |
| pull | deadlift, pull-up, lat pulldown, barbell row, seated cable row, db row, face pull, rear delt fly, barbell curl, hammer curl |
| legs | squat, romanian deadlift, leg press, hack squat, bulgarian split squat, lying leg curl, leg extension, hip thrust, standing calf raise, hanging leg raise |
| upper | bench press, barbell row, overhead press, lat pulldown, incline db press, seated cable row, lateral raise, barbell curl, tricep pushdown, face pull |
| lower | squat, romanian deadlift, leg press, bulgarian split squat, lying leg curl, leg extension, hip thrust, standing calf raise, cable crunch, plank |
| full | squat, bench press, barbell row, overhead press, romanian deadlift, lat pulldown, db curl, tricep pushdown, plank, treadmill |

User bisa menambah, menghapus, dan mengurutkan ulang template ini di halaman profil web (`split_templates` dengan `user_id` miliknya).

---

## 4. Format pesan set

Satu pesan = satu latihan. Huruf besar/kecil bebas, koma atau titik untuk desimal, `kg` boleh ditulis atau tidak.

| Tulisan | Artinya |
|---|---|
| `bench 72.5x5x3` | 3 set × 5 rep × 72,5 kg |
| `bench 72,5 x 5 x 3` | sama |
| `bench 72.5 kg 5x3` | sama |
| `bench 72.5x5` | 1 set |
| `bench 70x8, 70x7, 67.5x8` | 3 set dengan angka berbeda |
| `bench 80x5 75x6 70x8` | sama, pemisah spasi juga boleh (piramida terbalik / beban turun tiap set) |
| `75x6` *(tanpa nama latihan)* | set berikutnya untuk **latihan terakhir** di sesi ini |
| `bench 80x5 > 60x10` | drop set: set kedua langsung tanpa istirahat (`is_drop = true`) |
| `plank 60s x3` atau `plank 1m` | latihan durasi: 3 × 60 detik / 1 × 60 detik |
| `treadmill 20m` | kardio 20 menit |
| `lari 5km 28m` / `treadmill 30m 4km` | kardio dengan jarak (urutan bebas) |
| `pullup 8x3` atau `pullup bbx8x3` | berat badan, 3 × 8 |
| `pullup +10x6` | beban tambahan 10 kg, 1 set |
| `ohp 42.5x6x2 gagal` atau `ohp 42.5x6x2!` | rep terakhir gagal (tetap dicatat) |

Pemisah yang diterima: `x`, `×`, `*`.

```ts
// lib/parser.ts — kerangka
const SET = /(?<w>\+?\d+(?:[.,]\d+)?|bb)?\s*(?:kg)?\s*[x×*]?\s*(?<r>\d+)(?:\s*[x×*]\s*(?<s>\d+))?/i;
// 1. pisahkan nama latihan = kata-kata sebelum angka/“bb”/“+” pertama
// 2. sisanya dipecah per koma → tiap bagian dicocokkan ke SET
// 3. cek akhiran 'gagal' atau '!' → failed = true pada set terakhir
// 4. cari exercise lewat slug / aliases (lowercase, tanpa spasi ganda)
```

Wajib ada unit test untuk semua contoh di tabel di atas plus kasus salah (`bench`, `bench x5`, `70x8`).

Kalau format salah, balasan bot mengikuti 5.6 ("tidak dimengerti").

**Set lanjutan tanpa nama:** pesan yang cuma berisi angka (`75x6`) dicatat ke latihan terakhir di sesi yang sedang jalan, dengan `set_order` +1. Kalau belum ada latihan di sesi itu, bot tanya latihannya apa.

### Pencocokan nama yang longgar (wajib)

User **tidak harus** mengetik nama persis seperti di database. Semua nama & alias latihan dan teks dari user dinormalisasi dulu, baru dibandingkan.

**Langkah normalisasi (`lib/exercise-match.ts`):**

1. huruf kecil semua, hapus spasi di awal/akhir
2. `-` `_` `.` `/` `'` `’` → spasi (`close-grip` = `close grip`, `pull-up` = `pull up`, `captain's` = `captains`)
3. spasi ganda → satu spasi
4. ganti sinonim per kata:

| diketik | dianggap |
|---|---|
| dumbbell, dumbell, dumbel, db | db |
| barbell, barbel | barbel |
| machine, mesin, mc | mesin |
| cable, kabel | kabel |
| ezbar, ez-bar, ez bar | ez |
| raises → raise, curls → curl, rows → row, presses → press, extensions → extension, lunges → lunge (buang akhiran jamak `s`/`es` di kata terakhir) |

5. simpan juga versi **tanpa spasi** (`closegrippulldown`) untuk mencocokkan yang diketik nyambung.

**Urutan pencocokan** (berhenti di yang pertama ketemu):

1. sama persis setelah normalisasi (dengan atau tanpa spasi)
2. alias terpanjang yang jadi awalan teks (`leg press 100x10` → leg press)
3. **urutan kata bebas** — kumpulan katanya sama (`pulldown close grip` = `close grip pulldown`)
4. **typo** — trigram/Levenshtein, ambang ≥ 0,6 kemiripan → bot konfirmasi: *maksudnya **close-grip pulldown**? [iya] [bukan]*
5. kalau ada 2–4 kandidat mirip → tampilkan semuanya sebagai tombol
6. tidak ketemu → alur "latihan tidak dikenal" di bawah

Saat build/startup, buat indeks di memori dari semua `name` + `aliases` yang sudah dinormalisasi (≈ 270 latihan, kecil). Normalisasi yang **sama persis** dipakai juga untuk kolom cari di web.

**Unit test wajib** (semua harus ketemu latihan yang benar):

```
close grip pulldown 55x10   → close-grip pulldown
closegrip pulldown 55x10    → close-grip pulldown
Close-Grip Pulldown 55x10   → close-grip pulldown
pulldown close grip 55x10   → close-grip pulldown
pullup 8x3 / pull up 8x3    → pull-up
dumbell press 30x10         → db press
incline dumbbell press 24x10 → incline db press
lateral raises 10x15        → lateral raise
skullcrusher 30x10          → skull crusher
hip thrusts 100x10          → hip thrust
seated wide-grip row 50x12  → seated wide grip row
benc pres 70x8              → konfirmasi: bench press?
```

Kalau user memilih kandidat hasil typo/konfirmasi, teks yang dia ketik **disimpan sebagai alias pribadi** (tabel `user_aliases`: `user_id`, `alias`, `exercise_id`), jadi lain kali langsung dikenali tanpa ditanya.

```sql
create table user_aliases (
  user_id      uuid not null references users(id) on delete cascade,
  alias        text not null,              -- sudah dinormalisasi
  exercise_id  int  not null references exercises(id),
  primary key (user_id, alias)
);
```

### Latihan tidak dikenal / user lupa namanya

Urutan yang dicoba bot:

1. **Mirip nama (typo).** Cari slug/alias dengan jarak edit terkecil (mis. Levenshtein ≤ 2, atau trigram `pg_trgm`). Kalau ketemu:
   > maksudnya **bench press**? [iya] [bukan]
2. **Cari lewat tombol.** Kalau tidak ketemu atau user tekan *bukan*:
   > gapapa, kita cari bareng. → tombol otot → alat → daftar latihan, persis seperti `🔍 cari latihan lain` di 5.5. Paling bawah: `[✏️ gak ada, kasih nama sendiri]`.
3. **Simpan nama sendiri.** Kalau *gak ada*:
   > oke, mau dikasih nama apa?
   User ketik nama → dibuat baris `exercises` dengan `user_id` miliknya (latihan pribadi), `muscle`/`equipment` dari jawaban tombol tadi. Lain kali nama itu langsung dikenali.
4. **Jalan pintas:** `lain 40x12x3` → dicatat ke latihan `lain`, namanya bisa dikasih nanti di web.

Di web (halaman riwayat/profil), latihan pribadi bisa **diganti nama** atau **digabung** ke latihan bawaan: isi `merged_into`, lalu pindahkan semua `sets.exercise_id` ke latihan tujuan.

*Nanti (opsional):* user boleh mendeskripsikan gerakan pakai kalimat (“yang narik tali ke arah muka”) → dicocokkan pakai API AI. Bukan bagian versi pertama.

---

## 5. Bot Telegram — spesifikasi final

Bot: **spot.** — username **@spot_gymbot** (t.me/spot_gymbot). Karakternya bernama **spotter** (nama tampilan di telegram), lihat 5.9.

**Profil telegram** (disetel saat bot jalan, hanya kalau beda): nama `spotter`; deskripsi (tampil sebelum /start): *"👋 halo! aku spotter dari spot., teman latihanmu di gym. aku nyatet tiap set yang kamu angkat, ngisi angka dari latihan sebelumnya, ngingetin jadwal, dan kirim rekap + kartu story tiap kamu selesai latihan. yuk mulai!"*; deskripsi singkat: *"spotter dari spot. — teman latihan yang nyatet tiap set kamu di gym."*

> **Bagian ini satu-satunya acuan untuk bot.** Semua catatan bot sebelumnya (bot aktif, mode cepat, gaya bahasa v2, revisi uji coba) sudah dilebur ke sini dan yang bertentangan sudah dibuang. Perubahan berikutnya **langsung mengubah teks di bagian ini**, tidak menambah bagian "revisi" baru.

### 5.1 Prinsip

1. **Semua yang bisa dilakukan terlihat di layar.** Tidak ada fitur tersembunyi; perintah ketik hanya jalan pintas.
2. **Nama tombol menjelaskan dirinya sendiri** dan sama persis dengan yang disebut di teks.
3. **Setiap pesan bot diakhiri langkah berikutnya yang jelas** (tombol, atau "ketik … ya"). Tidak ada pesan buntu.
4. **Satu kartu per latihan, diedit di tempat.** Mencatat set tidak mengirim pesan baru. Chat tetap rapi.
5. **Angka sudah terisi dari latihan sebelumnya.** Kebanyakan cukup tekan ✅ catat.
6. **Ramah & utuh, bukan singkat kaku.** Emoji sebagai ikon, secukupnya (5.9).

### 5.2 Yang selalu terlihat

**Menu bawah (reply keyboard, persistent), 2 tombol:** `[🏋️ kartu latihan] [❓ bantuan]`
- `🏋️ kartu latihan` — belum ada sesi → tanya dulu split hari ini, lalu daftar latihan untuk dipilih sendiri (lihat "Pilih split & latihan" di 5.5); latihan yang dipilih jadi kartu. Sudah ada sesi **dengan set** → kirim ulang kartu aktif di paling bawah (kartu lama dihapus). Sesi yang **belum ada set sama sekali** dianggap belum mulai: kartu kosongnya dihapus, lalu tanya split lagi (tidak membuka sesi baru).
- `❓ bantuan` — menu topik (5.8).

**Daftar perintah (`setMyCommands`), urut:**
| perintah | fungsi |
|---|---|
| `/latihan` | sama dengan tombol 🏋️ kartu latihan |
| `/selesai` | selesai latihan + rekap (sama dengan 🏁 di kartu) |
| `/hapus` | hapus set atau seluruh latihan hari ini |
| `/kemarin` | catat latihan kemarin |
| `/libur` | tandai hari ini libur |
| `/geser` | pindahkan jadwal hari ini ke hari berikutnya |
| `/rekap` | ringkasan minggu ini |
| `/pr` | lihat rekor (`/pr bench`) |
| `/setara` | ganti benda pembanding rekap terakhir |
| `/masuk` | link masuk dashboard web |
| `/bantuan` | cara pakai |

Alias tersembunyi (tetap jalan, tidak ditampilkan): `/mulai` = `/latihan`, `/batal` = hapus set terakhir. Kata **"batal" tidak dipakai** di teks atau tombol mana pun.

### 5.3 Kenalan (`/start`, sekali)

Urutannya selalu: **perkenalan diri → apa yang dibantu → cara pakai → jadwal**.

**Pesan 1 (perkenalan + cara pakai, menu bawah ikut dikirim di sini):**
```
👋 halo andi! kenalin, aku spotter, teman latihanmu dari spot.
aku bantuin kamu nyatet latihan di gym: tiap set yang kamu angkat, angka dari latihan sebelumnya, sampai rekor baru. kamu fokus angkat, sisanya serahin ke aku!

begini cara pakainya:
1. di gym, tekan 🏋️ kartu latihan di bawah, pilih split hari ini (gak harus sama kayak jadwal), terus pilih latihannya dari daftar.
2. aku kirim kartu latihan yang angkanya udah keisi dari latihan sebelumnya. tiap selesai satu set, tekan ✅ catat. angkanya beda? ubah pakai ➖ ➕ dulu, atau ketik aja, misal 70x8 (70 kg, 8 rep).
3. selesai satu latihan? tekan ➡️ latihan berikutnya, terus pilih dari daftar, atau ketik aja nama latihannya. mau ganti split di tengah jalan? tekan 🔄 ganti latihan.
4. udah beres? tekan 🏁 selesai latihan, nanti aku kirim rekap + kartu story.

salah pencet? ada ↩️ hapus set terakhir di kartu. bingung? tekan ❓ bantuan kapan aja.
```

**Pesan 2 (jadwal):**
```
satu lagi: biar aku bisa ngingetin jadwal, aku pakai jadwal ini dulu ya:
📅 push pull legs — sen pull · sel legs · kam push
cocok?
[✅ oke, pakai ini]  [✏️ atur sendiri]
```
`✏️ atur sendiri` → 3 pertanyaan (pesan yang sama diedit): program `[push pull legs] [upper lower] [ppl + upper lower] [full body] [bebas]` → berapa kali seminggu `[3] [4] [5] [6]` → hari (tombol sen–min multi pilih + `[selesai]`). Split dibagi berurutan ke hari yang dipilih.
- Nama di sapaan = nama depan telegram (huruf kecil); tanpa nama → *"👋 halo! kenalin, aku spotter, …"*.
- Tiap langkah bernomor: *"oke, kita atur sendiri ya, cuma 3 pertanyaan. 1/3 · kamu biasanya latihan pakai program apa?"*, *"2/3 · …"*, *"3/3 · …"*. Langkah 2 dan 3 punya `[‹ kembali]` ke langkah sebelumnya.
- Langkah 3 menampilkan pratinjau yang berubah tiap kali hari diketuk: *"jadinya: 📅 push pull legs — sen push · rab pull · jum legs"*.

**Setelah jadwal dipilih, pesan 2 diedit** (tidak ada pesan baru, cara pakai tidak diulang):
```
jadwalmu:
📅 push pull legs — sen pull · sel legs · kam push
bisa diubah kapan aja lewat /start.

sip, semua udah siap 🙌 mau coba nyatet satu set dulu? cuma 30 detik dan gak masuk ke catatan beneran.
[▶️ coba sekarang (30 detik)]  [👍 ngerti]
```

`/start` lagi oleh user lama: *"👋 halo lagi, spotter di sini! mau atur ulang jadwal?"* `[✏️ atur ulang] [gak usah]`.

### 5.4 Latihan coba (opsional, dari tur atau ❓ bantuan)

Kartu sungguhan dengan data contoh (`bench press`, draft 60 kg × 8), **tidak disimpan** (`practice = true`), tidak dihitung ke "3 sesi pertama".
1. teks kartu: *"ini kartu latihan. angkanya udah aku isi. coba tekan ✅ catat."*
2. setelah catat: *"✅ mantap, set pertama kecatat! kalau angkanya beda, ubah dulu pakai ➖ ➕. coba tekan ➕ 1 rep, terus ✅ catat lagi."*
3. setelah catat lagi: *"🎉 gampang kan? kalau semua latihan udah beres, tekan 🏁 selesai latihan di kartu. sampai ketemu di gym 💪"* `[👍 ngerti]` → kartu contoh dihapus.

Ketikan selama latihan coba (mis. `6`) diterima dan dipuji: *"bisa juga diketik gitu 👍"*.

### 5.5 Kartu latihan

**Teks:**
```
🏋️ bench press · set 2 dari 3
push · latihan 2 dari 7 hari ini
minggu lalu set 2 kamu 72,5 kg × 6, udah aku isi di bawah.
➡️ 72,5 kg × 6
hari ini: ✅ 75×5
💡 ✅ catat = simpan set ini · ➖➕ = ubah angka dulu · ➡️ = pindah latihan · 🏁 = selesai & lihat rekap
```
- Baris 💡 hanya di **3 sesi pertama** (sesi nyata, bukan latihan coba).
- **Kartu pertama sesi** (belum ada set sama sekali): baris posisi diganti ajakan *"yuk mulai latihan push! hari ini ada 7 latihan, ini yang pertama."*
- **Reaksi setelah ✅ catat** (juga ketik cepat), dibanding set yang sama di sesi sebelumnya; tampil di kartu sampai aksi berikutnya:
  - beban naik → *"set 2 kecatat, beban naik 2,5 kg dari minggu lalu. mantap!"*
  - beban sama, rep naik → *"set 2 kecatat, 1 rep lebih banyak dari minggu lalu. mantap!"*
  - sama → *"set 2 kecatat, sama persis kayak minggu lalu."*
  - turun → *"set 2 kecatat. sedikit di bawah minggu lalu, gapapa, yang penting konsisten."*
  - tidak bisa dibandingkan (belum ada set ke-n sebelumnya, beban turun tapi rep naik, durasi/kardio) → *"set 2 kecatat. istirahat dulu ya, angka set berikutnya udah aku isi."*
  - "minggu lalu" jadi "sesi tadi" kalau angkanya dari sesi lain hari ini. Baris pr menggantikan reaksi; saat "n set beres" reaksi tidak ditampilkan.
- **Pengingat istirahat**: 90 detik setelah set dicatat (✅ catat atau ketik), kalau user belum menekan / mengetik apa pun, bot kirim satu pesan pendek supaya hp bunyi: *"⏱️ udah 1,5 menit istirahat. siap set 2 bench press? angkanya udah ada di kartu, tinggal tekan ✅ catat."* Pesan ini **dihapus begitu user menekan atau mengetik apa pun**, jadi tidak menambah isi chat. Hanya kalau latihan ini masih punya set berikutnya (belum "n set beres") dan ada angka draft; tidak untuk kardio, nyatet `/kemarin`, latihan coba, dan `chattiness = seperlunya`.
- "set n dari N": N = jumlah set latihan ini di sesi sebelumnya (bawaan 3). Kalau sudah lewat N: "set 4".
- Kalimat sumber angka: "minggu lalu …" (sesi sebelumnya), "tadi …" (sesi lain **hari ini**), atau "saran: +2,5 kg karena minggu lalu kerasa ringan".
- Latihan yang sudah dikerjakan di sesi lain hari ini: *"bench press udah kamu kerjain tadi (100×8 · 95×8 · 90×8). mau nambah set?"*
- Baris PR muncul setelah set PR: *"🏆 pr baru! naik 2,5 kg dari rekor sebelumnya."*
- Setelah hapus set: *"↩️ set 2 (72,5 kg × 6) udah dihapus."* + tombol `[↩️ urungkan]` (hilang setelah aksi berikutnya).

**Tombol (urut dari atas):**
```
[➖ 2,5 kg]                 [➕ 2,5 kg]
[➖ 1 rep]                  [➕ 1 rep]
[✅ catat 72,5 kg × 6]                        ← selalu
[↩️ hapus set terakhir]                       ← hanya kalau kartu ini sudah ada set
[➡️ latihan berikutnya]                       ← disembunyikan kalau semua latihan di daftar hari ini sudah ada set
[🔄 ganti latihan]          [🏁 selesai latihan]  ← selalu
```
- **Semua latihan di urutan sudah ada set** → `➡️` hilang, kartu menulis *"🎉 semua latihan push hari ini udah beres! tekan 🏁 selesai latihan buat lihat rekap."*, dan `🏁 selesai latihan` dipindah tepat di bawah `✅ catat` (lebar penuh).
- **Jumlah set sudah = N** → kartu menulis *"🙌 3 set beres, sama kayak minggu lalu. lanjut latihan apa? tekan ➡️ latihan berikutnya buat pilih dari daftar (masih ada 4 yang belum), atau ketik namanya."* (tombol tetap sama, `✅ catat` tetap bisa untuk set tambahan). Bot **tidak menyebut satu latihan tertentu** sebagai berikutnya.
- **`➡️ latihan berikutnya`** → kartu diedit jadi daftar latihan hari ini (sama seperti daftar setelah pilih split, tanpa latihan di kartu sekarang; yang sudah ada set diberi ✅):
```
➡️ mau lanjut latihan apa? pilih dari daftar, atau ketik nama latihannya. yang ada ✅ udah kamu kerjain hari ini.
[incline db press]  [overhead press]
…
[🔍 cari latihan lain]  [‹ kembali ke kartu]
```
  Latihan yang dipilih → aturan "Pindah latihan" di bawah. Mengetik nama latihan (5.6) juga langsung pindah kartu.

**Variasi menurut jenis latihan:**
| jenis | baris 1 | baris 2 | catat |
|---|---|---|---|
| beban | `➖/➕ 2,5 kg` (langkah per alat: barbel/smith/ez/trap bar 2,5 · dumbel 2 · mesin/kabel 5 · lb 5) | `➖/➕ 1 rep` | `✅ catat 72,5 kg × 6` |
| berat badan | `➖/➕ 2,5 kg tambahan` (0 = berat badan) | `➖/➕ 1 rep` | `✅ catat berat badan × 8` / `+5 kg × 6` |
| durasi | `➖/➕ 15 dtk` | — | `✅ catat 60 dtk` |
| kardio | `➖/➕ 5 mnt` | `➖/➕ 0,5 km` (kalau ada jarak) | `✅ catat 20 mnt · 3 km` |

**Angka otomatis (draft) untuk set ke-n:**
1. set ke-n dari sesi sebelumnya latihan ini (pola beban turun ikut otomatis);
2. tidak ada → salin set terakhir hari ini;
3. set ke-1 + rasa sesi lalu *ringan* → +1 langkah (kalimat "saran: …");
4. latihan belum pernah dicatat → tidak ada draft: kartu menulis *"ini pertama kali kamu nyatet bench press, jadi aku belum bisa nebak angkanya. ketik beban dan rep ya, contoh `60x8` (artinya 60 kg, 8 rep)."* Tombol ± dan ✅ catat disembunyikan; `➡️`, `🔄`, `🏁` tetap ada. Setelah satu set diketik, draft berikutnya = set itu.

**Urutan latihan hari ini** (dipakai untuk urutan daftar latihan, "latihan 2 dari 7", dan "masih ada n yang belum"): urutan sesi sebelumnya split ini → kalau belum ada, urutan template (`split_templates`). Latihan yang sudah ada set hari ini atau **dilewati** tidak dihitung "belum".
- **Template bawaan** (belum ada riwayat split ini, user belum mengatur template sendiri di profil): yang dihitung "latihan hari ini" (jumlah di "hari ini ada n latihan", "masih ada n yang belum", semua beres) cuma **5 teratas**. Daftar latihan (setelah pilih split, `➡️`, `🔄`) tetap sampai 10. Template milik user dan urutan sesi sebelumnya dihitung penuh.
- **"latihan n dari N"**: n = urutan dikerjakan di sesi ini (latihan yang sudah ada set dulu, lalu latihan di kartu); N = latihan hari ini + latihan lain yang sudah dikerjakan. Jadi latihan pertama yang dipilih selalu "latihan 1", walau di daftar letaknya ketujuh.

**Pindah latihan (pilih dari daftar `➡️` / `🔄`, atau ketik nama):**
- kartu lama yang **punya set** dipadatkan jadi satu baris tanpa tombol: `✅ bench press · 75×5 · 72,5×6 · 70×7 kg`, lalu kartu baru dikirim di paling bawah
- kartu lama **0 set** → pesan yang sama **berubah jadi kartu baru** (tidak ada kartu kosong tersisa), latihan lama ditandai `dilewati`

**`🔄 ganti latihan`:** kartu diedit jadi pilihan:
```
🔄 mau ganti ke latihan apa?
[sisa urutan hari ini …]          ← maks. 4, 2 kolom
[pengganti kalau alat dipakai …]  ← maks. 2, dari exercises.alternatives
[🔍 cari latihan lain]  [‹ kembali ke kartu]
```
`📅 ganti split hari ini` (baris sendiri, di atas `🔍 cari latihan lain`) → pilihan split, lihat di bawah.

`🔍 cari latihan lain` → pilih otot (14 tombol, 2 kolom) → daftar latihan 6 per halaman `[‹ sebelumnya] [selanjutnya ›]`, saring alat `[semua] [barbel] [dumbel] [mesin] [kabel] [berat badan]`, `[✏️ gak ada, kasih nama sendiri]`. Setelah dipilih, pesan ini **berubah jadi kartu**. Semua langkah edit di pesan yang sama.

**Pilih split & latihan (jadwal dan urutan cuma rekomendasi, bukan paksaan):**
- Mulai sesi (`🏋️ kartu latihan` / `/latihan` tanpa sesi), pesan baru:
```
🏋️ hari ini jadwalnya push. mau latihan push, atau lagi pengen yang lain?
pilih di bawah, nanti aku kasih daftar latihannya.
[✅ push · sesuai jadwal]
[pull]  [legs]
[bebas · pilih latihan sendiri]
```
  Bukan hari jadwal → *"🏋️ hari ini gak ada jadwal latihan, tapi gas aja! mau latihan apa?"* tanpa baris `✅ … sesuai jadwal`. Pilihan split = split program + jadwal user (kurang dari 2 → push, pull, legs, upper, lower, full). Setelah split dipilih, **pesan yang sama berubah jadi daftar latihan** (tidak langsung kartu):
```
🏋️ oke, latihan pull! mau mulai dari latihan apa?
ini rekomendasi buat pull, pilih yang mana aja, urutannya bebas. gak ada yang cocok? tekan 🔍 cari latihan lain atau ketik namanya.
[deadlift]  [pull-up]
[lat pulldown]  [barbell row]
…                                  ← urutan sesi sebelumnya split ini → template; maks. 10, 2 kolom
[🔍 cari latihan lain]  [‹ ganti split]
```
  Latihan yang sudah ada set di sesi ini diberi ✅ di depannya. Latihan yang dipilih → pesan yang sama jadi kartunya. `‹ ganti split` → kembali ke pilihan split. Belum ada daftar (bebas tanpa riwayat) → *"aku belum punya daftar buat ini. tekan 🔍 cari latihan lain, atau ketik nama latihannya."* `/mulai pull` dan `🏋️ mulai` di pengingat melewati pilihan split dan langsung ke daftar latihan split itu.
- Di tengah sesi (`🔄` → `📅 ganti split hari ini`), kartu diedit jadi: *"📅 mau ganti dari pull ke split apa? set yang udah kecatat tetap aman, nanti aku kasih daftar latihan split barunya."* + split lain (tanpa split sekarang) + `[bebas · pilih latihan sendiri]` + `[‹ kembali ke kartu]`. Setelah dipilih: split sesi diganti, daftar dilewati dikosongkan, pesan jadi daftar latihan split baru dengan `[🔍 cari latihan lain] [‹ kembali ke kartu]`; latihan yang dipilih jadi kartu (aturan pindah latihan di atas).
- Tombol split di pesan lama (bukan kartu aktif) saat sesi jalan → *"kartu ini udah lewat…"*.

### 5.6 Ngetik (jalan pintas, selalu boleh)

**Saat ada kartu aktif** — dibaca terhadap kartu:
| ketik | artinya |
|---|---|
| `6` | catat beban di kartu, 6 rep |
| `70 8` / `70x8` / `70,5*8` | catat 70 kg × 8 |
| `ok` / `y` / `+` | catat sesuai kartu |
| `-` | hapus set terakhir |
| `6 gagal` / `70x8!` | catat, rep terakhir gagal |
| `60s` / `20m` / `20m 3km` | latihan durasi/kardio |
| `bench 70x8` (pakai nama) | pindah ke latihan itu + catat |

Setelah terbaca: **hapus pesan user**, hapus kartu lama, kirim kartu terbaru di paling bawah.

**Tanpa kartu aktif:** `bench 70x8` → buka sesi + kartu bench press dengan set itu tercatat. Angka saja (`70x8`) → *"🤔 angkanya buat latihan apa? tekan 🏋️ kartu latihan dulu ya, atau ketik pakai nama, contoh `bench 70x8`."*

**Format lengkap** (juga dipakai di web & `/kemarin`): lihat bagian 4 — `bench 72.5x5x3`, `bench 80x5 75x6 70x8`, `bench 80x5 > 60x10` (drop set), `pullup +10x6`, `plank 60s x3`, `lari 5km 28m`. Nama latihan dicocokkan longgar (bagian 4).

**Tidak dimengerti:** pesan user **tidak** dihapus, balas: *"🤔 aku belum ngerti "75 lima". coba pakai angka ya, contoh `75x5`, atau cukup `5` kalau bebannya sama."* `[❓ cara pakai]`

### 5.7 Selesai & rekap

`🏁 selesai latihan` / `/selesai`:
1. kartu aktif: punya set → dipadatkan; 0 set → dihapus.
2. **satu pesan**: foto kartu story + caption:
```
🎉 latihan push selesai!
📊 total 5.120 kg — setara 4 mobil 🚗. aku cuma nonton.
naik 320 kg dari latihan push sebelumnya · 2 pr baru.
16 set · 58 menit · 🔥 streak 12 hari
gimana rasanya hari ini?
[😌 ringan] [👌 pas] [🥵 berat banget]
[📊 lihat di dashboard] [📤 bagikan ke story]     ← saat lokal: link ditulis di caption
```
- `auto_story` mati → pesan teks dengan isi & tombol yang sama.
- Belum ada set: *"belum ada set yang kecatat hari ini, jadi belum ada rekap. tekan 🏋️ kartu latihan buat mulai."* — **wajib selalu membalas**.
- Baris perbandingan: volume vs sesi selesai terakhir dengan split yang sama (*"naik 320 kg dari latihan push sebelumnya"* / *"150 kg di bawah latihan push sebelumnya, gapapa"*) dan jumlah latihan yang pecah rekor (*"2 pr baru"*). Tidak ada yang bisa disebut → barisnya tidak ada.
- Setelah rasa dipilih, tombol rasa diganti teks: *"noted 👍 latihan push berikutnya aku sesuaiin bebannya. jadwal berikutnya kamis, latihan pull. sampai ketemu!"* (besok → "besok"; hari yang sama minggu depan → "selasa depan"; tanpa jadwal → kalimat jadwal tidak ada).
- Sesi tanpa set baru **3 jam** → ditutup otomatis tanpa pesan; tombol di kartunya → *"sesi ini udah ditutup otomatis. tekan 🏋️ kartu latihan buat mulai lagi."*

### 5.8 Bantuan, hapus, jadwal

**`❓ bantuan` / `/bantuan`:**
```
❓ spotter siap bantu. mau tau soal apa?
[🏋️ cara nyatet set]     [➖➕ ubah angka]
[↩️ hapus & urungkan]    [📅 libur & jadwal]
[📊 rekap & pr]          [🌐 buka dashboard]
[▶️ latihan coba]
```
Tiap topik = penjelasan 3–4 baris + `[‹ kembali]`, edit di pesan yang sama.

**`/hapus`:** daftar set hari ini `[set 1 · bench press 75 × 5]` … + `[🗑️ hapus seluruh latihan push hari ini]` + `[‹ gak jadi]`. Konfirmasi selalu sebut apa & akibatnya:
> yakin hapus **set 1 · bench press 75 × 5**? ini pr kamu, kalau dihapus pr bench balik ke 72,5 kg. `[🗑️ ya, hapus] [‹ gak jadi]`

Setelah hapus: *"set 1 udah dihapus. pr bench sekarang 72,5 kg."* `[↩️ urungkan]`. Sesi tanggal lain dihapus lewat web (bot kasih link). **`↩️ hapus set terakhir` di kartu tidak pakai konfirmasi** (langsung + urungkan).

**Pengingat** (jam `reminder_time`, hari terjadwal, belum ada sesi, `notify_schedule` aktif):
> 👋 sore! hari ini jadwal push. siap berangkat? `[🏋️ mulai] [⏰ nanti] [😴 libur] [📅 geser ke besok]`
- `🏋️ mulai` → langsung daftar latihan split jadwal (tanpa ditanya split, karena pengingat sudah menyebutnya). `⏰ nanti` → *"oke, aku tunggu. tekan 🏋️ kartu latihan kalau udah di gym."*

**Hari:**
- `/libur [alasan]`: *"😴 oke, hari ini libur. istirahat juga bagian dari latihan, sampai besok ya."* (jatah habis: *"…tapi jatah libur minggu ini udah kepake, jadi streak mulai dari nol lagi."*)
- `/geser`: *"📅 push dipindah ke kamis. jadwal setelahnya ikut geser."*
- `/kemarin`: *"📅 oke, yang kamu catat abis ini masuk ke kemarin."* + kartu latihan; header kartu diberi tag `📅 kemarin`.
- Kelewat (pagi berikutnya, sekali): *"kemarin jadwal pull kelewat. gapapa banget, hari ini kita mulai lagi 💪"*

**Latihan tidak dikenal:** lihat bagian 4 (typo → konfirmasi → cari otot/alat → nama sendiri), semua lewat pesan yang diedit, berakhir jadi kartu.

### 5.9 Gaya bahasa & emoji

- **Karakter: spotter** — teman latihan yang ramah, enerjik, dan suka membantu. Bicara sebagai "aku", memanggil "kamu". Enerjiknya lewat pilihan kata (*yuk*, *siap*, *mantap*, *sisanya serahin ke aku*), bukan lewat emoji berderet atau tanda seru beruntun. Selalu menawarkan bantuan atau langkah berikutnya, tidak pernah menghakimi.

- Kalimat utuh, hangat, huruf kecil, kalem. Jelaskan arti format (*"ketik 60x8 (artinya 60 kg, 8 rep)"*).
- **Emoji sebagai ikon** di awal baris/tombol, **maks. 2 per pesan** (tombol tidak dihitung, maks. 1 per tombol), hanya dari daftar:

| konteks | emoji | konteks | emoji |
|---|---|---|---|
| sapaan | 👋 | latihan / kartu | 🏋️ |
| catat / berhasil | ✅ | ubah angka | ➖ ➕ |
| berikutnya | ➡️ | hapus set / urungkan | ↩️ |
| ganti latihan | 🔄 | selesai | 🏁 |
| pr | 🏆 | streak | 🔥 (satu) |
| rekap | 📊 | sesi beres | 🎉 |
| jadwal / kemarin | 📅 | nanti | ⏰ |
| libur | 😴 | tips | 💡 |
| bingung / bantuan | 🤔 ❓ | hapus (konfirmasi) | 🗑️ |
| cari | 🔍 | nama sendiri | ✏️ |
| setara | emoji bendanya | rasa | 😌 👌 🥵 |
| semangat (jarang) | 💪 🙌 | | |

- **Dilarang:** emoji berderet, 💯 😂 🤣 ‼️, huruf kapital semua, tanda seru beruntun, "BEAST MODE", menyindir user.
- `chattiness = seperlunya`: tanpa pengingat (termasuk pengingat istirahat), tanpa pertanyaan rasa, tanpa baris 💡; kartu & tombol tetap sama.
- Semua teks di `lib/copy.ts`.

### 5.10 Teknis

- **State (`bot_state`)**: `card_message_id`, `draft` (`exercise_id`, `set_order`, `weight_kg`, `reps`, `duration_sec`, `distance_m`, `is_added`), `skipped_exercise_ids`, `last_deleted_set_id` (untuk urungkan), `practice`, `backdate`, `sessions_done` (untuk 3 sesi pertama).
- **Callback data pendek, tanpa angka:** `c:w+` `c:w-` `c:r+` `c:r-` `c:ok` `c:del` `c:undo` `c:next` `c:swap` `c:split` `c:fin` …, pilih split `sp:<split>`; angka dibaca dari `draft`. Tombol dari kartu yang bukan `card_message_id` → *"kartu ini udah lewat. pakai kartu yang paling bawah ya."*
- Tombol yang mencatat **idempotent** (tekan dua kali cepat = satu set).
- Bot boleh menghapus pesan masuk di chat pribadi; kalau gagal (lebih dari 48 jam), abaikan.
- Satu sesi penuh menghasilkan maks.: 1 baris padat per latihan + 1 kartu aktif + 1 rekap (+ pesan pilihan sementara saat 🔄 yang berubah jadi kartu, + pengingat istirahat yang dihapus lagi di aksi berikutnya).
- **Pengingat istirahat disimpan di tabel `rest_reminders`** (`lib/bot/istirahat.ts`, migration `0009`): satu baris per chat (`due_at`, kartu & nomor set yang diharapkan, `message_id`). Dikirim oleh `sendDue()` — tiap 10 detik di `npm run bot`, tiap 30 detik lewat `/api/cron` setelah hosting — jadi pengingat datang 90–120 detik setelah set. Setiap update dari user menghapus baris itu (dan pesannya kalau sudah terkirim). Pengiriman "mengambil giliran" dulu (`message_id = 0`) supaya tidak terkirim dua kali.
- **Pesan terjadwal & cron**: lokal dijalankan `bot/dev.ts` tiap menit; setelah hosting, `pg_cron` di Supabase memanggil `GET /api/cron` tiap 30 detik dengan `Authorization: Bearer <CRON_SECRET>` (`supabase/cron.example.sql`). Pesan terjadwal hanya di paruh pertama tiap menit.
- **Webhook**: `POST /api/telegram` (grammY `webhookCallback`), header `X-Telegram-Bot-Api-Secret-Token` wajib cocok dengan `TELEGRAM_WEBHOOK_SECRET`. Dipasang/dilepas dengan `npm run webhook -- <alamat>` / `npm run webhook -- hapus`. Selama webhook terpasang, `npm run bot` menolak jalan (long polling akan menghapus webhook).

### 5.11 Skenario uji wajib (jalankan semua sebelum lapor selesai)

1. User baru: `/start` → pesan perkenalan + cara pakai (menu 2 tombol) lalu pesan jadwal → `✅ oke, pakai ini` → pesan jadwal yang sama jadi catatan jadwal + `[▶️ coba sekarang (30 detik)] [👍 ngerti]`, tanpa pesan baru.
2. Latihan coba: catat → ➕ 1 rep → catat → `👍 ngerti`; tidak ada data tersimpan.
3. Minggu lalu bench 75×5, 72,5×6, 70×7 → `🏋️ kartu latihan` → `✅ push · sesuai jadwal` → daftar latihan → `bench press` → 3× `✅ catat` tanpa ubah angka → tercatat sama persis.
4. Setelah 3 set: kartu bilang "3 set beres … lanjut latihan apa?", ada `[➡️ latihan berikutnya]` tanpa nama latihan; ditekan → daftar latihan (tanpa bench) → pilih incline → kartu bench jadi `✅ bench press · 75×5 · 72,5×6 · 70×7 kg`, kartu incline di bawah.
5. `➡️` di kartu 0 set → daftar → pilih latihan lain → pesan yang sama jadi kartu latihan itu (tidak ada kartu kosong tersisa), latihan lama ditandai dilewati.
6. Semua latihan urutan sudah ada set → tidak ada `➡️`, ada "semua udah beres" + `🏁` di bawah catat.
7. `🏁` kapan pun → satu pesan rekap; kartu 0 set terhapus. `/selesai` tanpa set → tetap membalas.
8. Ketik `6` saat kartu 72,5 × 5 → tercatat 72,5 × 6, pesan user terhapus, kartu pindah ke bawah.
9. `↩️ hapus set terakhir` dua kali → dua set hilang; `↩️ urungkan` mengembalikan yang terakhir.
10. `🏋️ kartu latihan` saat sesi jalan → kartu aktif dikirim ulang di bawah, bukan sesi baru.
11. Latihan belum pernah dicatat → kartu minta ketik, tanpa tombol ±/catat; setelah `60x8` muncul draft 60 × 8.
12. Kartu pull-up (berat badan), plank (durasi), treadmill (kardio) menampilkan tombol sesuai tabel.
13. Tidak ada kata "batal" di teks/tombol mana pun; tidak ada pesan bot tanpa tombol atau petunjuk langkah berikutnya.
14. Interaksi: sapaan memakai nama; atur sendiri bernomor 1/3–3/3, `‹ kembali` balik ke langkah sebelumnya, pratinjau jadwal ikut berubah; kartu pertama sesi berisi "yuk mulai"; setelah ✅ catat ada reaksi dibanding minggu lalu; "masih ada n yang belum"; rekap berisi baris perbandingan; setelah pilih rasa ada jadwal berikutnya.
15. Jadwal push tapi mau pull: `🏋️ kartu latihan` → pilihan split (push paling atas) → `pull` → pesan yang sama jadi **daftar latihan pull** (bukan langsung kartu), sesi tersimpan sebagai pull; `‹ ganti split` balik ke pilihan split; pilih latihan kedua di daftar → jadi kartu latihan itu. Di tengah sesi `🔄` → `📅 ganti split hari ini` → `legs` → split sesi jadi legs, pesan jadi daftar latihan legs + `‹ kembali ke kartu`; pilih → kartu legs. Tombol split di pesan lama → "kartu ini udah lewat". Pesan perkenalan berisi cara pakai sebelum pesan jadwal.
16. User tanpa riwayat legs, template bawaan: pilih `legs` → daftar tetap 10 latihan; pilih latihan **ketujuh** di daftar → kartu "yuk mulai latihan legs! hari ini ada 6 latihan" (5 teratas + yang dipilih); setelah 3 set, "masih ada 5 yang belum"; pindah ke latihan pertama di daftar → "latihan 2 dari 6".
17. Pengingat istirahat: ✅ catat set 1 dari 3 lalu diam → 90 detik kemudian satu pesan "⏱️ udah 1,5 menit istirahat. siap set 2 …"; tekan ✅ catat → pesan pengingat terhapus, set 2 tercatat. Catat lalu langsung tekan tombol lain sebelum 90 detik → tidak ada pengingat. Setelah "3 set beres", kardio, atau `chattiness = seperlunya` → tidak ada pengingat.

---

## 6. Logika hitungan

- **Volume set** = `weight_kg × reps`. Set berat badan atau beban tambahan (`is_added`) **tidak** dihitung ke volume.
- Latihan `durasi` dan `kardio` tidak masuk volume beban; rekap menampilkannya terpisah (*"+ 20 mnt kardio · plank 3 × 60 dtk"*). PR durasi = durasi terlama, PR kardio = jarak terjauh / pace tercepat (nanti).
- **Volume sesi** = jumlah volume set; disimpan ulang ke `workout_sessions.total_volume` tiap set masuk.
- **Perkiraan 1RM (Epley)** = `weight × (1 + reps / 30)`, dibulatkan 0,1 kg. Tampilkan dengan tanda `≈`.
- **PR**: set dianggap PR kalau `weight_kg` lebih besar dari semua set sebelumnya di latihan yang sama (untuk `reps ≥ 1`). Set `failed` tetap boleh jadi PR kalau rep yang tercatat berhasil.
- **Set teratas (top set)**: set dengan `weight_kg` terbesar per latihan per sesi. Grafik progres dan PR memakai top set; set beban turun / drop set tetap dihitung ke volume tapi tidak menurunkan progres.
- **Streak** (pilihan A — ikut jadwal + jatah libur):
  - hari yang **bukan jadwal** latihan tidak dihitung dan tidak memutus streak;
  - hari jadwal yang **ada sesinya** menambah streak;
  - hari jadwal yang ditandai **libur** tidak memutus streak, selama jumlah libur di minggu itu ≤ `rest_allowance` (bawaan 1);
  - hari jadwal yang **digeser** pindah ke hari berikutnya, tidak dihitung kelewat;
  - hari jadwal tanpa sesi dan tanpa status sampai lewat tengah malam → `kelewat`, streak kembali 0. Pagi harinya bot kirim: *kemarin kelewat. gapapa, hari ini mulai lagi.*
- **Saran beban**: dari `feel` sesi terakhir latihan itu — *ringan* → sarankan +2,5 kg (barbel) / +2 kg (dumbel); *pas* → sama; *berat* → sama atau -2,5 kg. Ditampilkan sebagai tombol, bukan paksaan.
- **Sesi minggu ini**: sesi dengan `started_at` Senin–Minggu minggu berjalan, dibandingkan `weekly_target`.

### Setara dengan

```ts
// lib/setara.ts
export const ITEMS = [
  { id: 'durian',    label: 'durian',          kg: 2,      group: 'ringan',   quip: 'jangan dicium semua.' },
  { id: 'kucing',    label: 'kucing',          kg: 4,      group: 'ringan',   quip: 'kucingnya gak ikut diangkat.' },
  { id: 'galon',     label: 'galon air',       kg: 19,     group: 'ringan',   quip: 'stok air sebulan aman.' },
  { id: 'beras',     label: 'karung beras',    kg: 25,     group: 'ringan',   quip: 'stok beras satu RT.' },
  { id: 'kulkas',    label: 'kulkas',          kg: 60,     group: 'menengah', quip: 'isinya belum diitung.' },
  { id: 'komodo',    label: 'komodo',          kg: 70,     group: 'menengah', quip: 'untung komodonya diem.' },
  { id: 'orangutan', label: 'orangutan',       kg: 80,     group: 'menengah', quip: 'mereka lebih kuat sih, tapi tetep.' },
  { id: 'motor',     label: 'motor matic',     kg: 110,    group: 'menengah', quip: 'parkiran penuh.' },
  { id: 'piano',     label: 'piano',           kg: 230,    group: 'menengah', quip: 'tanpa main satu lagu pun.' },
  { id: 'sapi',      label: 'sapi bali',       kg: 350,    group: 'menengah', quip: 'sapinya santai aja.' },
  { id: 'badak',     label: 'badak sumatera',  kg: 700,    group: 'berat',    quip: 'badaknya cuma kaget.' },
  { id: 'mobil',     label: 'mobil',           kg: 1200,   group: 'berat',    quip: 'aku cuma nonton.' },
  { id: 'gajah',     label: 'gajah sumatera',  kg: 3500,   group: 'berat',    quip: 'gajahnya aman kok.' },
  { id: 'paus',      label: 'paus biru',       kg: 150000, group: 'berat',    quip: 'pelan-pelan, pausnya kita kejar.' },
] as const;
```

Berat di atas perkiraan rata-rata, cukup untuk hiburan.

- **Format angka**: `n < 1` → `1/x` (contoh `1/29 paus biru`), `n < 2` → satu desimal (`1,5`), selain itu dibulatkan ke bawah dengan titik ribuan (`1.280`).
- **Mode otomatis**: ambil benda dengan `1 ≤ n ≤ 50`; kalau ada beberapa, pilih acak tapi jangan sama dengan rekap sebelumnya.
- **Mode kunci**: selalu pakai `user_settings.compare_item`.

---

## 7. Halaman web

| Route | Isi | Data |
|---|---|---|
| `/` | landing | statis |
| `/masuk` | tanpa token: petunjuk "buka bot, kirim /masuk". dengan `?token=`: cek token → buat sesi → ke dashboard | `login_tokens` |
| `/dashboard` | streak, sesi minggu ini, volume, pr bulan ini, kartu setara, pr terakhir, grafik progres, kalender 12 minggu, 3 sesi terakhir | semua tabel |
| `/dashboard/progres` | pilih latihan → grafik beban terberat per minggu, e1RM, 3 sesi terakhir | `sets` |
| `/dashboard/riwayat` | daftar sesi per minggu + detail set; tiap set bisa diedit/dihapus, tombol **hapus sesi**; konfirmasi berisi ringkasan + akibat (pr yang hilang); toast *"… dihapus · urungkan"* 10 detik | `workout_sessions`, `sets` |
| `/dashboard/pr` | pr terbaru, semua rekor, perjalanan pr, rekor per rep | `personal_records` |
| `/dashboard/profil` | telegram, program & jadwal split, template latihan per split, target, jatah libur, jam pengingat, tingkat cerewet bot, satuan, mode setara, notifikasi, latihan pribadi (ganti nama / gabung / hapus), ekspor csv, **hapus akun** (wajib ketik `hapus`, jeda 7 hari) | `user_settings`, `split_templates`, `exercises` |
| `/bagikan/[id]` | pratinjau kartu story, gaya (oranye/gelap/kapur), benda setara, tombol bagikan | sesi |

Semua halaman dashboard harus enak di HP (menu samping jadi atas, tabel bisa digeser).

---

## 8. Brand

**Warna**

| Token | Hex | Pakai untuk |
|---|---|---|
| `--spot-orange` | `#FF6B35` | aksen, tombol utama, angka penting |
| `--spot-orange-dark` | `#D9531F` | bayangan aksen |
| `--spot-bg` | `#121212` | latar |
| `--spot-panel` | `#1B1B1A` | kartu |
| `--spot-line` | `#2A2A28` | garis & border |
| `--spot-text` | `#F2F0EB` | teks utama (kapur) |
| `--spot-muted` | `#9C9A93` | teks sekunder |
| `--spot-danger` | `#FF5C5F` | tombol "ya, hapus" (teks di atasnya `#121212`) |
| `--spot-danger-soft` | `#FF8A8C` | teks/garis tombol hapus sekunder, peringatan |
| `--spot-danger-bg` | `#2A1617` | latar kotak peringatan |

Merah **hanya** untuk aksi hapus, supaya tidak tertukar dengan oranye brand.

Teks di atas oranye selalu `#121212`, jangan putih.

**Font:** Geist (judul & teks), Geist Mono (angka kecil, label, tanggal). Pakai paket `geist` untuk Next.js.

**Logo (hex):** huruf "o" di "spot" diganti segi enam dengan titik oranye.

```svg
<svg viewBox="3.5 0.5 49 55">
  <polygon points="28,4 48.8,16 48.8,40 28,52 7.2,40 7.2,16"
           fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round"/>
  <circle cx="28" cy="28" r="6.5" fill="#FF6B35"/>
</svg>
```

Di wordmark: lebar hex `0.5em`, tinggi `0.56em`, duduk di baseline, margin kiri `0.075em`, kanan `0.02em`, `letter-spacing: -0.06em`, `font-weight: 800`.

---

## 9. Urutan pengerjaan

1. **Setup** — `create-next-app`, Tailwind, Geist, Supabase project, jalankan migration + seed.
2. **Parser** — `lib/parser.ts` + unit test (paling penting, kerjakan sebelum bot).
3. **Bot dasar (lokal)** — grammY long polling lewat `npm run bot`.
4. **Logika** — volume, top set, PR, e1RM, streak (ikut jadwal + jatah libur), setara.
4b. **Bot sesuai bagian 5** — kenalan + tur, kartu latihan, ngetik cepat, selesai & rekap, bantuan, hapus, jadwal. Lulus semua skenario 5.11.
4c. **Hapus & urungkan** — soft delete, hitung ulang volume/PR/streak.
5. **Login web** — `/masuk` di bot → link token → cookie sesi.
6. **Dashboard ringkasan**, lalu progres, riwayat, pr, profil.
7. **Kartu story** — `next/og` + halaman bagikan; bot kirim gambar saat `/selesai`.
8. **Landing.**
9. **Hosting** — deploy Vercel (region `hnd1`, sama dengan Supabase di Tokyo), bot pindah dari polling ke webhook `/api/telegram`, cron lewat `pg_cron` Supabase ke `/api/cron`. Alamat web otomatis dari `VERCEL_PROJECT_PRODUCTION_URL` (atau `NEXT_PUBLIC_APP_URL` kalau diisi). Opsional nanti: Telegram Login Widget.

---

## 10. Environment

```
TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_BOT_USERNAME=spot_gymbot   # dipakai untuk link "buka bot" (t.me/spot_gymbot)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # hanya di server, jangan pernah ke client
SESSION_SECRET=                 # minimal 32 karakter, untuk cookie sesi
NEXT_PUBLIC_APP_URL=http://localhost:3000   # lokal saja; di vercel kosongkan (otomatis alamat produksi)

# hosting (vercel):
TELEGRAM_WEBHOOK_SECRET=        # acak, dicek di header X-Telegram-Bot-Api-Secret-Token
CRON_SECRET=                    # acak, dicek di header Authorization panggilan /api/cron
```

`.env.local` jangan di-commit.
