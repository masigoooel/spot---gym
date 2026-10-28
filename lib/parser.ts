// lib/parser.ts — pembaca pesan set (SPEC §4)
// murni, tanpa i/o: dipakai bot dan web. teks balasan ada di lib/copy.ts.

import { levenshtein, matchExercise, typoCandidates } from "./exercise-match";

export { levenshtein };

export type ExerciseKind = "beban" | "durasi" | "kardio";

export type ExerciseRef = {
  id: number;
  slug: string;
  name: string;
  aliases: string[];
  isBodyweight: boolean;
  muscle?: string;
  equipment?: string;
  alternatives?: string[];
  kind?: ExerciseKind; // bawaan "beban"
};

// satu entri per set (`5x3` → 3 entri), sama dengan satu baris di tabel `sets`
export type ParsedSet = {
  weightKg: number | null; // null = berat badan
  isAdded: boolean; // true = beban tambahan (`+10`)
  reps: number | null; // null untuk latihan durasi/kardio
  durationSec: number | null; // plank 60 detik, treadmill 1200 detik
  distanceM: number | null; // kardio, opsional
  failed: boolean;
  isDrop: boolean; // drop set: lanjut tanpa istirahat dari set sebelumnya (`80x5 > 60x10`)
};

export type ParseError = "empty" | "no_name" | "no_sets" | "bad_set";

export type ParseResult =
  | {
      ok: true;
      name: string;
      exercise: ExerciseRef | null;
      sets: ParsedSet[];
      continuation: boolean; // pesan tanpa nama yang dicatat ke latihan terakhir
    }
  | { ok: false; reason: ParseError };

export type ParseOptions = {
  // latihan terakhir di sesi yang sedang jalan: pesan tanpa nama (`75x6`) masuk ke sini
  lastExercise?: ExerciseRef | null;
  // paksa latihan ini, mis. setelah user memilih lewat tombol untuk pesan yang namanya tidak dikenal
  exercise?: ExerciseRef;
};

const MAX_WEIGHT_KG = 9999.99; // numeric(6,2)
const MAX_REPS = 999;
const MAX_SETS = 50;
const MAX_DURATION_SEC = 6 * 60 * 60;
const MAX_DISTANCE_M = 500_000;

// satu set, setelah normalisasi (pemisah jadi `x`, desimal jadi `.`).
// berat wajib diikuti `kg` atau `x`, supaya `72.555x5` tidak terbaca 72.55 × 5 × 5.
const SET =
  /^(?:(?<w>\+?\d+(?:\.\d{1,2})?|bb)(?:\s*kg\s*x?\s*|\s*x\s*)|x\s*)?(?<r>\d+)(?:\s*x\s*(?<s>\d+))?$/;

// awal bagian angka: token yang diawali angka, `+`, atau `bb` yang berdiri sendiri
// / diikuti `x` atau angka (jadi alias seperti `bbrow` tetap terbaca sebagai nama)
const FIRST_NUMBER = /(?:^|\s)(?=\d|\+|bb(?:[x\d\s]|$))/;

const FAILED_SUFFIX = /(?:\s*(?:gagal|!+))+$/;

export function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// pencocokan nama ada di lib/exercise-match.ts (normalisasi, sinonim, urutan kata bebas, salah ketik)
export function findExercise(name: string, catalog: ExerciseRef[]): ExerciseRef | null {
  return matchExercise(name, catalog);
}

// kandidat salah ketik (1–4 latihan, paling mirip dulu)
export function suggestExercises(name: string, catalog: ExerciseRef[]): ExerciseRef[] {
  return typoCandidates(name, catalog);
}

export function suggestExercise(name: string, catalog: ExerciseRef[]): ExerciseRef | null {
  return suggestExercises(name, catalog)[0] ?? null;
}

// ---------- pesan set ----------

export function parseSetMessage(text: string, catalog: ExerciseRef[], opts: ParseOptions = {}): ParseResult {
  let t = normalizeName(text).replace(/[×*]/g, "x");

  const failed = FAILED_SUFFIX.test(t);
  t = t.replace(FAILED_SUFFIX, "").trim();
  if (!t) return { ok: false, reason: "empty" };

  // 1. nama latihan = kata-kata sebelum angka / `bb` / `+` pertama
  const boundary = FIRST_NUMBER.exec(t);
  const name = boundary ? t.slice(0, boundary.index).trim() : t;
  const rest = boundary ? t.slice(boundary.index).trim() : "";

  // pesan tanpa nama (`75x6`) cuma sah kalau ada latihan yang bisa dilanjutkan
  const continuation = !name && !opts.exercise && !!opts.lastExercise;
  if (!name && !opts.exercise && !opts.lastExercise) return { ok: false, reason: "no_name" };
  if (!rest) return { ok: false, reason: "no_sets" };

  const exercise = opts.exercise ?? (name ? findExercise(name, catalog) : opts.lastExercise!);

  // 2. angka dibaca sesuai jenis latihan. latihan yang belum dikenal dicoba sebagai
  //    beban dulu, lalu durasi, lalu kardio (jenisnya dipastikan setelah latihannya dipilih).
  const kind = exercise ? (exercise.kind ?? "beban") : null;
  const bodyweight = exercise?.isBodyweight ?? false;
  const sets =
    kind === "durasi"
      ? parseDurations(rest)
      : kind === "kardio"
        ? parseCardio(rest)
        : kind === "beban"
          ? parseLoads(rest, bodyweight)
          : (parseLoads(rest, false) ?? parseDurations(rest) ?? parseCardio(rest));
  if (!sets || sets.length > MAX_SETS) return { ok: false, reason: "bad_set" };
  if (sets.length === 0) return { ok: false, reason: "no_sets" };

  // 3. akhiran `gagal` / `!` → rep terakhir gagal (set terakhir saja)
  if (failed) sets[sets.length - 1].failed = true;

  return { ok: true, name: name || exercise!.name, exercise, sets, continuation };
}

// beban × rep: dipecah per koma, lalu per `>` (drop set), lalu per spasi (`80x5 75x6 70x8`)
function parseLoads(rest: string, bodyweight: boolean): ParsedSet[] | null {
  const sets: ParsedSet[] = [];
  for (const segment of splitByComma(rest, bodyweight)) {
    const parts = segment.split(">").map((p) => p.trim());
    for (const [i, part] of parts.entries()) {
      const parsed = part ? parsePart(part, bodyweight) : null;
      if (!parsed) return null;
      sets.push(...parsed.map((s) => ({ ...s, isDrop: i > 0 })));
    }
  }
  return sets;
}

// koma desimal (`1,5m`, `5,2km`) jadi titik; koma yang diikuti spasi tetap pemisah
const commaDecimals = (rest: string) => rest.replace(/(\d),(\d)/g, "$1.$2");

// durasi: `60s x3`, `1m`, `45 dtk`, `60x3` (angka polos = detik). beberapa set boleh dipisah spasi/koma.
function parseDurations(rest: string): ParsedSet[] | null {
  const tokens = commaDecimals(rest)
    .replace(/(\d)\s+(s|dtk|detik|m|mnt|menit)\b/g, "$1$2")
    .replace(/\s*x\s*/g, "x")
    .split(/[\s,]+/)
    .filter(Boolean);
  const sets: ParsedSet[] = [];
  for (const token of tokens) {
    const m = /^(\d+(?:\.\d+)?)(s|dtk|detik|m|mnt|menit)?(?:x(\d+))?$/.exec(token);
    if (!m) return null;
    const minutes = m[2] === "m" || m[2] === "mnt" || m[2] === "menit";
    const seconds = Math.round(Number(m[1]) * (minutes ? 60 : 1));
    const count = m[3] ? Number(m[3]) : 1;
    if (!(seconds >= 1 && seconds <= MAX_DURATION_SEC) || !(count >= 1 && count <= MAX_SETS)) return null;
    for (let i = 0; i < count; i++) sets.push(emptySet({ durationSec: seconds }));
  }
  return sets;
}

// kardio: satu sesi dengan durasi dan/atau jarak, urutan bebas: `20m`, `5km 28m`, `30m 4km`, `1j`.
// `m` = menit (jarak wajib pakai km); angka polos = menit.
function parseCardio(rest: string): ParsedSet[] | null {
  const tokens = commaDecimals(rest)
    .replace(/(\d)\s+(km|m|mnt|menit|j|jam)\b/g, "$1$2")
    .split(/\s+/)
    .filter(Boolean);
  let durationSec: number | null = null;
  let distanceM: number | null = null;
  for (const token of tokens) {
    const m = /^(\d+(?:\.\d+)?)(km|m|mnt|menit|j|jam)?$/.exec(token);
    if (!m) return null;
    const value = Number(m[1]);
    if (m[2] === "km") {
      if (distanceM !== null) return null;
      distanceM = Math.round(value * 1000);
    } else {
      if (durationSec !== null) return null;
      durationSec = Math.round(value * (m[2] === "j" || m[2] === "jam" ? 3600 : 60));
    }
  }
  if (durationSec === null && distanceM === null) return null;
  if (durationSec !== null && !(durationSec >= 1 && durationSec <= MAX_DURATION_SEC)) return null;
  if (distanceM !== null && !(distanceM >= 1 && distanceM <= MAX_DISTANCE_M)) return null;
  return [emptySet({ durationSec, distanceM })];
}

function emptySet(patch: Partial<ParsedSet>): ParsedSet {
  return { weightKg: null, isAdded: false, reps: null, durationSec: null, distanceM: null, failed: false, isDrop: false, ...patch };
}

// koma bisa berarti desimal (`72,5 x 5`) atau pemisah set (`70x8, 70x7`).
// desimal kalau angka sebelumnya ada di posisi berat (awal, setelah spasi, `>` atau `+`)
// dan koma langsung diikuti angka. di latihan berat badan angka polos itu rep
// (`pullup 8,8,7`), jadi hanya beban tambahan (`+2,5`) yang dianggap desimal.
function splitByComma(rest: string, bodyweight: boolean): string[] {
  const withDecimals = rest.replace(/(^|[\s>+])(\d+),(\d)/g, (match, before: string, int: string, digit: string) =>
    bodyweight && before !== "+" ? match : `${before}${int}.${digit}`,
  );
  return withDecimals
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// satu bagian utuh (`72.5 kg 5x3`), atau beberapa set yang dipisah spasi (`80x5 75x6 70x8`)
function parsePart(part: string, bodyweight: boolean): Omit<ParsedSet, "isDrop">[] | null {
  const whole = parseSegment(part, bodyweight);
  if (whole) return whole;

  const tokens = part.split(/\s+(?=\+|\d|bb)/);
  if (tokens.length < 2) return null;
  const sets: Omit<ParsedSet, "isDrop">[] = [];
  for (const token of tokens) {
    const parsed = parseSegment(token, bodyweight);
    if (!parsed) return null;
    sets.push(...parsed);
  }
  return sets;
}

function parseSegment(segment: string, bodyweight: boolean): Omit<ParsedSet, "isDrop">[] | null {
  const m = SET.exec(segment);
  if (!m?.groups) return null;
  const { w } = m.groups;
  const r = Number(m.groups.r);
  const s = m.groups.s === undefined ? undefined : Number(m.groups.s);

  let weightKg: number | null = null;
  let isAdded = false;
  let reps = r;
  let count = s ?? 1;

  if (w === "bb") {
    // berat badan, ditulis eksplisit
  } else if (w?.startsWith("+")) {
    weightKg = Number(w.slice(1));
    isAdded = true;
  } else if (w !== undefined) {
    if (bodyweight) {
      // `pullup 8x3` = 8 rep × 3 set; tiga angka polos tidak jelas maksudnya
      if (s !== undefined || !/^\d+$/.test(w)) return null;
      reps = Number(w);
      count = r;
    } else {
      weightKg = Number(w);
    }
  } else if (!bodyweight) {
    return null; // latihan berbeban wajib ada berat (`bench x5`, `bench 8`)
  }

  if (weightKg !== null && !(weightKg > 0 && weightKg <= MAX_WEIGHT_KG)) return null;
  if (!(reps >= 1 && reps <= MAX_REPS)) return null;
  if (!(count >= 1 && count <= MAX_SETS)) return null;

  return Array.from({ length: count }, () => ({ weightKg, isAdded, reps, durationSec: null, distanceM: null, failed: false }));
}
