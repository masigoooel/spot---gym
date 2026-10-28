// lib/stats.ts — hitungan untuk dashboard web (murni, tanpa i/o).
// semua tanggal berupa `YYYY-MM-DD` di zona waktu user.

import { addDays, e1rm, successfulReps, weekStart, type SplitSchedule } from "./workout";

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

// awal minggu (senin) untuk n minggu terakhir, dari yang paling lama sampai minggu ini
export function lastWeeks(today: string, n: number): string[] {
  const current = weekStart(today);
  return Array.from({ length: n }, (_, i) => addDays(current, (i - n + 1) * 7));
}

// split terjadwal yang paling lama ditinggal, untuk sapaan "leg day terakhir 6 hari lalu"
export function neglectedSplit(
  sessions: { split: string | null; date: string }[],
  schedule: SplitSchedule,
  today: string,
  minDays = 4,
): { split: string; days: number } | null {
  let worst: { split: string; days: number } | null = null;
  for (const split of new Set(Object.values(schedule))) {
    const dates = sessions.filter((s) => s.split === split).map((s) => s.date);
    if (dates.length === 0) continue; // belum pernah dilatih, tidak ada "terakhir"
    const last = dates.reduce((a, b) => (a > b ? a : b));
    const days = daysBetween(last, today);
    if (days >= minDays && (!worst || days > worst.days)) worst = { split, days };
  }
  return worst;
}

// ---------- grafik & kalender ----------

// beban terberat per minggu; null kalau minggu itu tidak dilatih
export function weeklyMax(points: { date: string; kg: number }[], weeks: string[]): (number | null)[] {
  const max = new Map<string, number>();
  for (const p of points) {
    const w = weekStart(p.date);
    max.set(w, Math.max(max.get(w) ?? -Infinity, p.kg));
  }
  return weeks.map((w) => max.get(w) ?? null);
}

export type HeatCell = { date: string; level: 0 | 1 | 2 | 3; volume: number; sessions: number; future: boolean };

// kalender n minggu, urut per kolom minggu (senin → minggu). level 1–3 = sepertiga
// volume harian terendah / tengah / tertinggi di rentang ini; 0 = tidak latihan.
export function heatmap(
  days: { date: string; volume: number }[],
  today: string,
  weeks = 12,
): HeatCell[] {
  const byDate = new Map<string, { volume: number; sessions: number }>();
  for (const d of days) {
    const cur = byDate.get(d.date) ?? { volume: 0, sessions: 0 };
    byDate.set(d.date, { volume: cur.volume + d.volume, sessions: cur.sessions + 1 });
  }

  const start = lastWeeks(today, weeks)[0];
  const dates = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const volumes = dates
    .map((d) => byDate.get(d)?.volume ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  const cut1 = volumes[Math.floor(volumes.length / 3)] ?? 0;
  const cut2 = volumes[Math.floor((volumes.length * 2) / 3)] ?? 0;

  return dates.map((date) => {
    const day = byDate.get(date);
    const volume = day?.volume ?? 0;
    let level: HeatCell["level"] = 0;
    if (day) level = volume < cut1 ? 1 : volume < cut2 ? 2 : 3;
    return { date, level, volume, sessions: day?.sessions ?? 0, future: date > today };
  });
}

// ---------- rekor ----------

export type RepRecord = { reps: number; weightKg: number; date: string };

// beban terberat untuk tiap jumlah rep yang pernah dicatat (rep berhasil saja)
export function repRecords(
  sets: { weightKg: number | null; reps: number | null; failed: boolean; date: string }[],
): { bestE1rm: number | null; byReps: RepRecord[] } {
  const best = new Map<number, RepRecord>();
  let bestE1rm: number | null = null;
  for (const s of sets) {
    const reps = successfulReps(s);
    if (s.weightKg === null || reps < 1) continue;
    const cur = best.get(reps);
    if (!cur || s.weightKg > cur.weightKg) best.set(reps, { reps, weightKg: s.weightKg, date: s.date });
    const est = e1rm(s.weightKg, reps);
    if (bestE1rm === null || est > bestE1rm) bestE1rm = est;
  }
  return { bestE1rm, byReps: [...best.values()].sort((a, b) => a.reps - b.reps) };
}

// perubahan persen, null kalau tidak ada pembanding
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
