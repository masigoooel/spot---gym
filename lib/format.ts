// format angka gaya indonesia: desimal pakai koma (72,5), ribuan pakai titik (5.120)
// berat selalu disimpan dalam kg; lb hanya untuk tampilan dan input user yang pilih lb.

import type { ParsedSet } from "./parser";

export type Unit = "kg" | "lb";

const LB_PER_KG = 2.20462262185;

const NUMBER = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export function formatNumber(n: number): string {
  return NUMBER.format(n);
}

// kg → angka di satuan user (lb dibulatkan 0,1)
export function toUnit(kg: number, unit: Unit): number {
  return unit === "lb" ? Math.round(kg * LB_PER_KG * 10) / 10 : kg;
}

// angka di satuan user → kg untuk disimpan (dibulatkan 0,01 sesuai numeric(6,2))
export function fromUnit(value: number, unit: Unit): number {
  return unit === "lb" ? Math.round((value / LB_PER_KG) * 100) / 100 : value;
}

export function formatKg(kg: number, unit: Unit = "kg"): string {
  return `${formatNumber(toUnit(kg, unit))} ${unit}`;
}

// ---------- tanggal (zona waktu user) ----------

function parts(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const p = new Intl.DateTimeFormat("id-ID", { timeZone, ...options }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === type)?.value.toLowerCase() ?? "";
  return { weekday: get("weekday"), day: get("day"), month: get("month"), year: get("year") };
}

// `22 okt`
export function formatDay(date: Date, timeZone: string): string {
  const p = parts(date, timeZone, { day: "numeric", month: "short" });
  return `${p.day} ${p.month}`;
}

// `kam, 22 okt`
export function formatDayShort(date: Date, timeZone: string): string {
  const p = parts(date, timeZone, { weekday: "short", day: "numeric", month: "short" });
  return `${p.weekday}, ${p.day} ${p.month}`;
}

// `kamis, 22 oktober`
export function formatDayLong(date: Date, timeZone: string): string {
  const p = parts(date, timeZone, { weekday: "long", day: "numeric", month: "long" });
  return `${p.weekday}, ${p.day} ${p.month}`;
}

// `29 oktober 2026`
export function formatDate(date: Date, timeZone: string): string {
  const p = parts(date, timeZone, { day: "numeric", month: "long", year: "numeric" });
  return `${p.day} ${p.month} ${p.year}`;
}

// `agustus 2026`
export function formatMonthYear(date: Date, timeZone: string): string {
  const p = parts(date, timeZone, { month: "long", year: "numeric" });
  return `${p.month} ${p.year}`;
}

// ---------- durasi & jarak ----------

// `60 dtk`, `3 mnt 30 dtk`, `20 mnt`, `1 j 5 mnt` (di bawah 3 menit tetap detik, seperti plank)
export function formatDuration(sec: number): string {
  if (sec < 180) return `${sec} dtk`;
  if (sec < 3600) return sec % 60 === 0 ? `${sec / 60} mnt` : `${Math.floor(sec / 60)} mnt ${sec % 60} dtk`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m ? `${h} j ${m} mnt` : `${h} j`;
}

// `4 km`, `5,2 km`
export function formatDistance(m: number): string {
  return `${formatNumber(Math.round(m / 10) / 100)} km`;
}

// set durasi/kardio: `60 dtk`, `20 mnt · 4 km`; null kalau set beban
function timedLabel(s: { durationSec?: number | null; distanceM?: number | null }): string | null {
  const parts = [
    s.durationSec ? formatDuration(s.durationSec) : null,
    s.distanceM ? formatDistance(s.distanceM) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

// baris tambahan rekap (durasi & kardio tidak masuk volume): `20 mnt kardio (3 km)`, `plank 3 × 60 dtk`
export function timedExtras(
  sets: { name: string; kind: string; durationSec: number | null; distanceM: number | null }[],
): string[] {
  const cardio = sets.filter((s) => s.kind === "kardio");
  const out: string[] = [];
  if (cardio.length) {
    const sec = cardio.reduce((t, s) => t + (s.durationSec ?? 0), 0);
    const m = cardio.reduce((t, s) => t + (s.distanceM ?? 0), 0);
    const parts = [sec ? `${formatDuration(sec)} kardio` : "kardio", m ? `(${formatDistance(m)})` : null];
    out.push(parts.filter(Boolean).join(" "));
  }
  const byName = new Map<string, number[]>();
  for (const s of sets) {
    if (s.kind === "kardio" || !s.durationSec) continue;
    byName.set(s.name, [...(byName.get(s.name) ?? []), s.durationSec]);
  }
  // durasi sama yang berurutan digabung: `plank 3 × 60 dtk, 2 × 75 dtk`
  for (const [name, secs] of byName) {
    const groups: { sec: number; n: number }[] = [];
    for (const sec of secs) {
      const last = groups[groups.length - 1];
      if (last?.sec === sec) last.n++;
      else groups.push({ sec, n: 1 });
    }
    out.push(`${name} ${groups.map((g) => (g.n > 1 ? `${g.n} × ${formatDuration(g.sec)}` : formatDuration(g.sec))).join(", ")}`);
  }
  return out;
}

// ---------- set ----------

type SetLike = Pick<ParsedSet, "weightKg" | "isAdded" | "reps"> & Partial<Pick<ParsedSet, "durationSec" | "distanceM">>;

// `72,5 kg × 5 × 3`, set berurutan yang sama digabung; durasi `60 dtk × 3`, kardio `20 mnt · 4 km`
export function summarizeSets(sets: SetLike[], unit: Unit = "kg"): string {
  const groups: { label: string; count: number }[] = [];
  for (const s of sets) {
    const load = s.weightKg === null ? "berat badan" : `${s.isAdded ? "+" : ""}${formatKg(s.weightKg, unit)}`;
    const label = timedLabel(s) ?? `${load} × ${s.reps}`;
    const last = groups[groups.length - 1];
    if (last?.label === label) last.count++;
    else groups.push({ label, count: 1 });
  }
  return groups.map((g) => (g.count > 1 ? `${g.label} × ${g.count}` : g.label)).join(", ");
}

// chip satu set di dashboard: `72,5 × 5`, `bb × 20`, `+10 × 6`, `drop 60 × 10`, `60 dtk`, `20 mnt · 4 km`
export function formatSetChip(
  s: SetLike & { isDrop?: boolean },
  unit: Unit,
): string {
  const timed = timedLabel(s);
  if (timed) return timed;
  const drop = s.isDrop ? "drop " : "";
  if (s.weightKg === null) return `${drop}bb × ${s.reps}`;
  return `${drop}${s.isAdded ? "+" : ""}${formatNumber(toUnit(s.weightKg, unit))} × ${s.reps}`;
}
