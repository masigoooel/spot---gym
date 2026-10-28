// lib/workout.ts — hitungan latihan (SPEC §6): volume, e1rm, pr, streak, jadwal

// reps null = set durasi/kardio
export type VolumeSet = { weightKg: number | null; isAdded: boolean; reps: number | null };
export type LoggedSet = VolumeSet & { failed: boolean };

// sesi tanpa set baru selama ini ditutup otomatis
export const SESSION_IDLE_MS = 3 * 60 * 60 * 1000;

// ---------- volume ----------

// set berat badan, beban tambahan, durasi, dan kardio tidak dihitung ke volume
export function setVolume(s: VolumeSet): number {
  return s.weightKg === null || s.isAdded || s.reps === null ? 0 : s.weightKg * s.reps;
}

export function sessionVolume(sets: VolumeSet[]): number {
  const total = sets.reduce((sum, s) => sum + setVolume(s), 0);
  return Math.round(total * 100) / 100;
}

// ---------- e1rm & pr ----------

// perkiraan 1rm (epley), dibulatkan 0,1 kg
export function e1rm(weightKg: number, reps: number): number {
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// rep yang berhasil: kalau ditandai gagal, rep terakhir tidak dihitung
export function successfulReps(s: Pick<LoggedSet, "reps" | "failed">): number {
  if (s.reps === null) return 0;
  return s.failed ? s.reps - 1 : s.reps;
}

export type NewPr = {
  index: number; // posisi set di pesan
  weightKg: number;
  reps: number; // rep yang berhasil
  e1rm: number;
  previousWeightKg: number;
};

// pr = berat lebih besar dari semua set sebelumnya di latihan yang sama.
// satu pesan paling banyak satu pr (set terberat). set pertama di sebuah
// latihan jadi patokan, bukan pr. set gagal tetap boleh pr kalau masih ada
// rep yang berhasil.
export function detectPr(previousBestKg: number | null, sets: LoggedSet[]): NewPr | null {
  if (previousBestKg === null) return null;

  let best: NewPr | null = null;
  sets.forEach((s, index) => {
    const reps = successfulReps(s);
    if (s.weightKg === null || reps < 1) return;
    if (s.weightKg <= previousBestKg || (best && s.weightKg <= best.weightKg)) return;
    best = { index, weightKg: s.weightKg, reps, e1rm: e1rm(s.weightKg, reps), previousWeightKg: previousBestKg };
  });
  return best;
}

// pr durasi = durasi terlama (plank, wall sit, dead hang). set pertama jadi patokan.
export function detectDurationPr(
  previousBestSec: number | null,
  sets: { durationSec: number | null }[],
): { index: number; durationSec: number; previousSec: number } | null {
  if (previousBestSec === null) return null;
  let best: { index: number; durationSec: number; previousSec: number } | null = null;
  sets.forEach((s, index) => {
    if (s.durationSec === null || s.durationSec <= previousBestSec) return;
    if (best && s.durationSec <= best.durationSec) return;
    best = { index, durationSec: s.durationSec, previousSec: previousBestSec };
  });
  return best;
}

// ---------- tanggal (zona waktu user) ----------

// tanggal lokal `YYYY-MM-DD`
export function localDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date,
  );
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 1 = senin … 7 = minggu
export function weekdayOf(ymd: string): number {
  const day = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isoWeekday(date: Date, timeZone: string): number {
  return weekdayOf(localDate(date, timeZone));
}

// senin di minggu yang sama
export function weekStart(ymd: string): string {
  return addDays(ymd, 1 - weekdayOf(ymd));
}

// ---------- jadwal & streak ----------

export type SplitSchedule = Record<string, string>;

// split hari ini dari user_settings.split_schedule, null kalau hari libur
export function scheduledSplit(schedule: SplitSchedule, date: Date, timeZone: string): string | null {
  return schedule[String(isoWeekday(date, timeZone))] ?? null;
}

// ---------- status hari & streak (SPEC §6, pilihan A: ikut jadwal + jatah libur) ----------

export type DayStatus = "libur" | "geser" | "kelewat";

export type StreakInput = {
  sessionDates: string[]; // tanggal lokal yang punya sesi berisi set
  schedule: SplitSchedule;
  statuses?: Record<string, DayStatus>; // dari tabel day_status
  restAllowance?: number; // jatah libur per minggu yang tidak memutus streak (bawaan 1)
  today: string;
};

type DayKind = "latihan" | "lewati" | "putus" | "belum";

// arti satu hari untuk streak:
// - ada sesi → menambah (termasuk latihan ekstra di hari yang bukan jadwal)
// - bukan jadwal → dilewati, tidak dihitung dan tidak memutus
// - jadwal digeser → dilewati
// - jadwal libur dalam jatah minggu itu → dilewati; libur di luar jatah → putus
// - jadwal tanpa sesi: hari ini belum selesai ("belum"), hari sebelumnya → putus (kelewat)
function streakClassifier(input: StreakInput) {
  const trained = new Set(input.sessionDates);
  const statuses = input.statuses ?? {};
  const allowance = input.restAllowance ?? 1;
  const scheduled = (ymd: string) => input.schedule[String(weekdayOf(ymd))] !== undefined;

  // libur yang masih dalam jatah: urutan ke-1..allowance di minggunya
  const allowedRest = new Set<string>();
  const perWeek = new Map<string, number>();
  for (const day of Object.keys(statuses).sort()) {
    if (statuses[day] !== "libur" || !scheduled(day)) continue;
    const week = weekStart(day);
    const n = (perWeek.get(week) ?? 0) + 1;
    perWeek.set(week, n);
    if (n <= allowance) allowedRest.add(day);
  }

  return (day: string): DayKind => {
    if (trained.has(day)) return "latihan";
    if (!scheduled(day)) return "lewati";
    const status = statuses[day];
    if (status === "geser") return "lewati";
    if (status === "libur") return allowedRest.has(day) ? "lewati" : "putus";
    if (status === "kelewat") return "putus";
    return day === input.today ? "belum" : "putus";
  };
}

// jumlah hari latihan berturut-turut, mundur dari hari ini sampai sesi pertama user
export function streakDays(input: StreakInput): number {
  if (input.sessionDates.length === 0) return 0;
  const kind = streakClassifier(input);
  const first = input.sessionDates.reduce((a, b) => (a < b ? a : b));

  let streak = 0;
  for (let day = input.today; day >= first; day = addDays(day, -1)) {
    const k = kind(day);
    if (k === "latihan") streak++;
    else if (k === "putus") break;
  }
  return streak;
}

// streak terpanjang sepanjang masa, aturannya sama dengan streakDays
export function longestStreak(input: StreakInput): number {
  if (input.sessionDates.length === 0) return 0;
  const kind = streakClassifier(input);
  const first = input.sessionDates.reduce((a, b) => (a < b ? a : b));

  let best = 0;
  let run = 0;
  for (let day = first; day <= input.today; day = addDays(day, 1)) {
    const k = kind(day);
    if (k === "latihan") best = Math.max(best, ++run);
    else if (k === "putus") run = 0;
  }
  return best;
}

// ---------- rencana minggu ----------

// split tiap hari di minggu ini, setelah /geser diperhitungkan: hari yang digeser
// kosong, splitnya pindah ke hari latihan berikutnya, dan jadwal setelahnya ikut
// mundur satu. split yang terdorong lewat hari minggu dilewati.
export function weekPlan(
  monday: string,
  schedule: SplitSchedule,
  statuses: Record<string, DayStatus> = {},
): Record<string, string | null> {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const training = days.filter((d) => schedule[String(weekdayOf(d))] !== undefined);
  const queue = training.map((d) => schedule[String(weekdayOf(d))]);

  const plan: Record<string, string | null> = Object.fromEntries(days.map((d) => [d, null]));
  let next = 0;
  for (const day of training) {
    if (statuses[day] === "geser") continue;
    plan[day] = queue[next++] ?? null;
  }
  return plan;
}

// split untuk satu tanggal menurut rencana minggunya
export function plannedSplit(
  day: string,
  schedule: SplitSchedule,
  statuses: Record<string, DayStatus> = {},
): string | null {
  return weekPlan(weekStart(day), schedule, statuses)[day] ?? null;
}

// hari latihan berikutnya di minggu yang sama (tujuan /geser), atau null
export function nextTrainingDay(day: string, schedule: SplitSchedule): string | null {
  for (let d = addDays(day, 1); d < addDays(weekStart(day), 7); d = addDays(d, 1)) {
    if (schedule[String(weekdayOf(d))] !== undefined) return d;
  }
  return null;
}

// jadwal latihan berikutnya setelah `day` (maks. 7 hari ke depan), untuk penutup rekap
export function nextScheduledDay(day: string, schedule: SplitSchedule): { day: string; split: string; inDays: number } | null {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(day, i);
    const split = schedule[String(weekdayOf(d))];
    if (split !== undefined) return { day: d, split, inDays: i };
  }
  return null;
}

// ---------- kenalan: program → jadwal ----------

export const PROGRAM_SPLITS = {
  ppl: ["push", "pull", "legs"],
  upper_lower: ["upper", "lower"],
  ppl_ul: ["push", "pull", "legs", "upper", "lower"],
  full_body: ["full"],
  bebas: ["bebas"],
} as const;

// split dibagi berurutan ke hari yang dipilih (1 = senin … 7 = minggu)
export function buildSchedule(program: keyof typeof PROGRAM_SPLITS, days: number[]): SplitSchedule {
  const splits = PROGRAM_SPLITS[program];
  return Object.fromEntries([...days].sort((a, b) => a - b).map((day, i) => [String(day), splits[i % splits.length]]));
}

// ---------- saran beban (dari rasa sesi terakhir) ----------

export type Feel = "ringan" | "pas" | "berat";

// pilihan beban untuk tombol, yang disarankan paling depan. bukan paksaan.
export function suggestLoads(lastKg: number, feel: Feel | null, equipment?: string): number[] {
  const step = equipment === "dumbel" ? 2 : 2.5;
  if (feel === "ringan") return [lastKg + step, lastKg];
  if (feel === "berat" && lastKg > step) return [lastKg, lastKg - step];
  return [lastKg, lastKg + step];
}
