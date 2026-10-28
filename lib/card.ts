// kartu latihan (SPEC §5.5–5.6). murni, tanpa i/o:
// angka otomatis (draft), langkah ±, ketik cepat, dan isi kartu (teks + tombol).

import { copy } from "./copy";
import { formatNumber, formatSetChip, fromUnit, toUnit, type Unit } from "./format";
import type { ExerciseKind } from "./parser";
import type { Feel } from "./workout";

export type CardSet = {
  weightKg: number | null; // null = berat badan
  isAdded: boolean;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;
  failed?: boolean;
};

export const DEFAULT_TARGET = 3; // "set n dari N": N bawaan kalau belum ada sesi sebelumnya

export type DraftSource =
  | { kind: "last"; order: number; set: CardSet } // set ke-n sesi sebelumnya
  | { kind: "repeat" } // salin set terakhir hari ini
  | { kind: "suggest" } // set ke-1, sesi lalu ringan → naik satu langkah
  | { kind: "none" } // belum pernah dicatat: minta ketik
  | { kind: "manual" }; // angka sudah diubah pakai ±

const round2 = (n: number) => Math.round(n * 100) / 100;
const clean = (s: CardSet): CardSet => ({
  weightKg: s.weightKg,
  isAdded: s.isAdded,
  reps: s.reps,
  durationSec: s.durationSec,
  distanceM: s.distanceM,
});

// ---------- angka otomatis (§5.5) ----------

export function computeDraft(
  previous: CardSet[], // set latihan ini di sesi sebelumnya, urut
  today: CardSet[], // set latihan ini yang sudah dicatat di sesi ini, urut
  feel: Feel | null, // rasa sesi sebelumnya
  stepKg: number,
): { draft: CardSet | null; source: DraftSource } {
  const n = today.length + 1;
  const fromPrevious = previous[n - 1];
  if (fromPrevious) {
    if (n === 1 && feel === "ringan" && fromPrevious.weightKg !== null && fromPrevious.reps !== null) {
      return { draft: { ...clean(fromPrevious), weightKg: round2(fromPrevious.weightKg + stepKg) }, source: { kind: "suggest" } };
    }
    return { draft: clean(fromPrevious), source: { kind: "last", order: n, set: clean(fromPrevious) } };
  }
  if (today.length > 0) return { draft: clean(today[today.length - 1]), source: { kind: "repeat" } };
  return { draft: null, source: { kind: "none" } };
}

// ---------- langkah ± ----------

// langkah beban (kg) mengikuti alat: barbel/smith/ez/trap bar 2,5 · dumbel 2 · mesin/kabel 5
export function weightStepKg(equipment: string | undefined): number {
  if (equipment === "dumbel") return 2;
  if (equipment === "mesin" || equipment === "kabel") return 5;
  return 2.5;
}

export type Field = "w" | "r" | "t" | "k"; // beban, rep, waktu, jarak (km)

// label langkah di tombol, di satuan user: `2,5 kg`, `2,5 kg tambahan`, `5 lb`, `1 rep`, `15 dtk`, `5 mnt`, `0,5 km`
export function stepLabel(field: Field, kind: ExerciseKind, equipment: string | undefined, unit: Unit, bodyweight = false) {
  if (field === "r") return "1 rep";
  if (field === "t") return kind === "kardio" ? "5 mnt" : "15 dtk";
  if (field === "k") return "0,5 km";
  const w = unit === "lb" ? "5 lb" : `${formatNumber(weightStepKg(equipment))} kg`;
  return bodyweight ? `${w} tambahan` : w;
}

export function adjustDraft(
  draft: CardSet,
  field: Field,
  dir: 1 | -1,
  opts: { kind: ExerciseKind; equipment?: string; unit: Unit; isBodyweight: boolean },
): CardSet {
  if (field === "r") return { ...draft, reps: Math.max(1, (draft.reps ?? 0) + dir) };
  if (field === "t") {
    const step = opts.kind === "kardio" ? 300 : 15;
    return { ...draft, durationSec: Math.max(step, (draft.durationSec ?? 0) + dir * step) };
  }
  if (field === "k") return { ...draft, distanceM: Math.max(500, (draft.distanceM ?? 0) + dir * 500) };
  const current = draft.weightKg ?? 0;
  const next =
    opts.unit === "lb"
      ? fromUnit(Math.round(toUnit(current, "lb") / 5) * 5 + dir * 5, "lb")
      : round2(current + dir * weightStepKg(opts.equipment));
  if (next <= 0) {
    // berat badan: beban tambahan 0 = berat badan saja
    return opts.isBodyweight ? { ...draft, weightKg: null, isAdded: false } : draft;
  }
  return { ...draft, weightKg: next, isAdded: opts.isBodyweight ? true : draft.isAdded };
}

// ---------- ketik cepat (§5.6) ----------

export type Quick =
  | { type: "ok"; count: number } // ok / y / + / x3
  | { type: "delete" } // -
  | { type: "reps"; reps: number; failed: boolean } // 6, 6 gagal → beban di kartu
  | { type: "set"; weight: number; reps: number; failed: boolean }; // 70 8 → 70 kg × 8 (satuan user)

const FAILED = /\s*(?:gagal|!+)$/;

export function parseQuick(text: string, kind: ExerciseKind): Quick | null {
  let t = text.trim().toLowerCase();
  if (/^(ok|oke|okay|y|ya|\+)$/.test(t)) return { type: "ok", count: 1 };
  const times = /^x\s*(\d{1,2})$/.exec(t);
  if (times && Number(times[1]) >= 1) return { type: "ok", count: Math.min(10, Number(times[1])) };
  if (t === "-") return { type: "delete" };
  if (kind !== "beban") return null; // angka polos di latihan durasi = detik, dibaca parser
  const failed = FAILED.test(t);
  t = t.replace(FAILED, "").trim();
  if (/^\d{1,3}$/.test(t) && Number(t) > 0) return { type: "reps", reps: Number(t), failed };
  const pair = /^(\d{1,4}(?:[.,]\d{1,2})?)\s+(\d{1,3})$/.exec(t);
  if (pair && Number(pair[2]) > 0) {
    return { type: "set", weight: Number(pair[1].replace(",", ".")), reps: Number(pair[2]), failed };
  }
  return null;
}

// ---------- isi kartu (§5.5) ----------

// `72,5 kg × 6`, `berat badan × 8`, `+5 kg × 6`, `60 dtk`, `20 mnt · 3 km`
export function setLabel(s: CardSet, unit: Unit): string {
  if (s.reps === null) return formatSetChip(s, unit);
  const load = s.weightKg === null ? "berat badan" : `${s.isAdded ? "+" : ""}${formatNumber(toUnit(s.weightKg, unit))} ${unit}`;
  return `${load} × ${s.reps}`;
}

// chip pendek: `75×5`, `bb×8`, `+5×6`, `60 dtk`, `75×5 gagal`
export const shortChip = (s: CardSet, unit: Unit) => {
  const chip = formatSetChip(s, unit).replace(" × ", "×");
  return s.failed ? copy.card.failedChip(chip) : chip;
};

export type Notice =
  | { kind: "pr"; text: string }
  | { kind: "logged" } // barusan catat: reaksi dibanding set yang sama sesi sebelumnya
  | { kind: "deleted"; order: number; set: CardSet; other: string | null }
  | { kind: "restored"; order: number; set: CardSet }
  | { kind: "text"; text: string };

export type CardInput = {
  name: string;
  kind: ExerciseKind;
  isBodyweight: boolean;
  equipment?: string;
  unit: Unit;
  split: string | null;
  position: number; // latihan ke-berapa hari ini
  total: number; // jumlah latihan hari ini
  yesterday: boolean; // sesi /kemarin
  today: CardSet[]; // set latihan ini di sesi ini
  target: number; // N: jumlah set sesi sebelumnya (bawaan 3)
  hasPrevious: boolean;
  when: "minggu lalu" | "tadi"; // asal angka: sesi sebelumnya, atau sesi lain hari ini
  earlierToday: CardSet[] | null; // set latihan ini di sesi lain hari ini
  draft: CardSet | null;
  source: DraftSource;
  hasNext: boolean; // masih ada latihan di daftar hari ini yang belum dikerjakan (➡️ = pilih dari daftar)
  remaining: number; // latihan di urutan hari ini yang belum dikerjakan (selain yang ini)
  opening: boolean; // kartu pertama sesi ini: baris ajakan mulai
  previous: CardSet[]; // set latihan ini di sesi sebelumnya (untuk reaksi setelah catat)
  allDone: boolean; // semua latihan di urutan hari ini sudah ada set
  tips: boolean; // 3 sesi pertama
  notice: Notice | null;
  undoable: boolean; // [↩️ urungkan]
  prefix?: string; // awalan data tombol: "c" kartu, "p" latihan coba
  practice?: string; // instruksi latihan coba (tombol navigasi tidak ditampilkan)
};

export type Button = { text: string; data: string };

export function renderCard(c: CardInput): { text: string; rows: Button[][] } {
  const p = c.prefix ?? "c";
  const b = copy.card.buttons;
  const order = c.today.length + 1;
  const lines: string[] = [copy.card.title(c.name, order, c.target, c.yesterday)];
  if (c.opening && c.total > 0) lines.push(copy.card.opening(c.split, c.total));
  else if (c.total > 0) lines.push(copy.card.position(c.split, c.position, c.total));

  // kalimat asal angka / keadaan kartu
  const complete = c.today.length > 0 && c.today.length === c.target;
  if (complete) {
    lines.push(copy.card.complete(c.today.length, c.hasPrevious, c.hasNext, c.remaining));
  } else if (c.earlierToday && c.today.length === 0) {
    lines.push(copy.card.earlierToday(c.name, c.earlierToday.map((s) => shortChip(s, c.unit))));
  } else if (c.source.kind === "last") {
    lines.push(copy.card.fromLast(c.when, c.source.order, setLabel(c.source.set, c.unit)));
  } else if (c.source.kind === "suggest") {
    lines.push(copy.card.suggest(stepLabel("w", c.kind, c.equipment, c.unit)));
  } else if (c.source.kind === "none") {
    const how = c.kind !== "beban" ? c.kind : c.isBodyweight ? "bb" : "beban";
    lines.push(copy.card.firstTime(c.name, how));
  }
  if (c.draft) lines.push(copy.card.draft(setLabel(c.draft, c.unit)));
  if (c.today.length) lines.push(copy.card.today(c.today.map((s) => shortChip(s, c.unit))));
  if (c.allDone) lines.push(copy.card.allDone(c.split));

  const n = c.notice;
  if (n?.kind === "pr" || n?.kind === "text") lines.push(n.text);
  else if (n?.kind === "logged" && !complete && c.today.length) {
    const order = c.today.length;
    lines.push(copy.card.logged(order, compareSet(c.today[order - 1], c.previous[order - 1], c.unit), c.when));
  }
  else if (n?.kind === "deleted") lines.push(copy.card.deleted(n.order, setLabel(n.set, c.unit), n.other));
  else if (n?.kind === "restored") lines.push(copy.card.restored(n.order, setLabel(n.set, c.unit)));
  if (c.tips && c.draft) lines.push(copy.card.tips);
  if (c.practice) lines.push(c.practice);

  // tombol, urut dari atas
  const rows: Button[][] = [];
  const pair = (field: Field, label: string): Button[] => [
    { text: b.minus(label), data: `${p}:${field}-` },
    { text: b.plus(label), data: `${p}:${field}+` },
  ];
  if (c.draft) {
    if (c.kind === "beban") {
      rows.push(pair("w", stepLabel("w", c.kind, c.equipment, c.unit, c.isBodyweight)));
      rows.push(pair("r", "1 rep"));
    } else {
      rows.push(pair("t", stepLabel("t", c.kind, c.equipment, c.unit)));
      if (c.kind === "kardio" && c.draft.distanceM) rows.push(pair("k", stepLabel("k", c.kind, c.equipment, c.unit)));
    }
    rows.push([{ text: b.log(setLabel(c.draft, c.unit)), data: `${p}:ok` }]);
  }
  if (c.practice !== undefined) return { text: lines.join("\n"), rows };

  const finish: Button = { text: b.finish, data: `${p}:fin` };
  if (c.allDone) rows.push([finish]); // pindah tepat di bawah ✅ catat, lebar penuh
  const del: Button[] = [
    ...(c.today.length > 0 ? [{ text: b.del, data: `${p}:del` }] : []),
    ...(c.undoable ? [{ text: b.undo, data: `${p}:undo` }] : []),
  ];
  if (del.length) rows.push(del);
  if (c.hasNext && !c.allDone) rows.push([{ text: b.next, data: `${p}:next` }]);
  rows.push([{ text: b.swap, data: `${p}:swap` }, ...(c.allDone ? [] : [finish])]);
  return { text: lines.join("\n"), rows };
}

// set yang barusan dicatat dibanding set yang sama di sesi sebelumnya (latihan beban saja)
export type Comparison =
  | { kind: "heavier"; diff: string } // beban naik
  | { kind: "moreReps"; reps: number } // beban sama, rep naik
  | { kind: "same" }
  | { kind: "lower" } // beban atau rep turun
  | null; // tidak bisa dibandingkan

export function compareSet(now: CardSet | undefined, before: CardSet | undefined, unit: Unit): Comparison {
  if (!now || !before || now.reps === null || before.reps === null) return null;
  const w = now.weightKg ?? 0;
  const bw = before.weightKg ?? 0;
  if (w > bw) return { kind: "heavier", diff: `${formatNumber(round2(toUnit(w - bw, unit)))} ${unit}` };
  if (w < bw) return now.reps > before.reps ? null : { kind: "lower" };
  if (now.reps > before.reps) return { kind: "moreReps", reps: now.reps - before.reps };
  return now.reps === before.reps ? { kind: "same" } : { kind: "lower" };
}

// kartu yang sudah lewat: satu baris tanpa tombol, `✅ bench press · 75×5 · 72,5×6 · 70×7 kg`
export function compactCard(name: string, today: CardSet[], unit: Unit) {
  const weighted = today.some((s) => s.reps !== null && s.weightKg !== null);
  return copy.card.compact(
    name,
    today.map((s) => shortChip(s, unit)),
    weighted ? unit : null,
  );
}
