import { describe, expect, it } from "vitest";
import { findExercise, levenshtein, parseSetMessage, suggestExercise, type ExerciseRef, type ParsedSet } from "./parser";

const CATALOG: ExerciseRef[] = [
  { id: 1, slug: "bench-press", name: "bench press", aliases: ["bench", "bp"], isBodyweight: false },
  { id: 2, slug: "overhead-press", name: "overhead press", aliases: ["ohp", "press"], isBodyweight: false },
  { id: 3, slug: "incline-db-press", name: "incline db press", aliases: ["incline", "idb"], isBodyweight: false },
  { id: 7, slug: "barbell-row", name: "barbell row", aliases: ["row", "bbrow"], isBodyweight: false },
  { id: 8, slug: "pull-up", name: "pull-up", aliases: ["pullup", "pu"], isBodyweight: true },
  { id: 15, slug: "barbell-curl", name: "barbell curl", aliases: ["curl", "bbc"], isBodyweight: false },
];

const set = (weightKg: number | null, reps: number, extra: Partial<ParsedSet> = {}): ParsedSet => ({
  weightKg,
  isAdded: false,
  reps,
  durationSec: null,
  distanceM: null,
  failed: false,
  isDrop: false,
  ...extra,
});

const times = (n: number, s: ParsedSet) => Array.from({ length: n }, () => ({ ...s }));

function parse(text: string) {
  return parseSetMessage(text, CATALOG);
}

function expectSets(text: string, slug: string | null, sets: ParsedSet[]) {
  const result = parse(text);
  expect(result.ok, `"${text}" harus terbaca`).toBe(true);
  if (!result.ok) return;
  expect(result.exercise?.slug ?? null).toBe(slug);
  expect(result.sets).toEqual(sets);
}

describe("parseSetMessage: contoh di SPEC §4", () => {
  const benchTiga = times(3, set(72.5, 5));

  it.each([
    ["bench 72.5x5x3"],
    ["bench 72,5 x 5 x 3"],
    ["bench 72.5 kg 5x3"],
  ])("%s → 3 set × 5 rep × 72,5 kg", (text) => {
    expectSets(text, "bench-press", benchTiga);
  });

  it("bench 72.5x5 → 1 set", () => {
    expectSets("bench 72.5x5", "bench-press", [set(72.5, 5)]);
  });

  it("bench 70x8, 70x7, 67.5x8 → 3 set dengan angka berbeda", () => {
    expectSets("bench 70x8, 70x7, 67.5x8", "bench-press", [set(70, 8), set(70, 7), set(67.5, 8)]);
  });

  it.each([["pullup 8x3"], ["pullup bbx8x3"]])("%s → berat badan, 3 × 8", (text) => {
    expectSets(text, "pull-up", times(3, set(null, 8)));
  });

  it("pullup +10x6 → beban tambahan 10 kg, 1 set", () => {
    expectSets("pullup +10x6", "pull-up", [set(10, 6, { isAdded: true })]);
  });

  it.each([["ohp 42.5x6x2 gagal"], ["ohp 42.5x6x2!"]])("%s → rep terakhir gagal", (text) => {
    expectSets(text, "overhead-press", [set(42.5, 6), set(42.5, 6, { failed: true })]);
  });
});

describe("parseSetMessage: format salah", () => {
  it.each([
    ["bench", "no_sets"],
    ["70x8", "no_name"],
    ["", "empty"],
    ["   ", "empty"],
  ] as const)("%j → %s", (text, reason) => {
    expect(parse(text)).toEqual({ ok: false, reason });
  });

  it.each([
    ["bench x5"],
    ["bench 8"], // latihan berbeban tanpa berat
    ["bench 70x8 abc"], // sisa teks yang tidak terbaca
    ["bench 70x8, x5"],
    ["bench 0x5"],
    ["bench 70x0"],
    ["bench 70x8x0"],
    ["bench 72.555x5"], // lebih dari 2 desimal
    ["bench 10000x5"], // tidak muat numeric(6,2)
    ["pullup 20x8x3"], // tiga angka polos di latihan berat badan
  ])("%s → gagal dibaca", (text) => {
    expect(parse(text).ok).toBe(false);
  });
});

describe("parseSetMessage: variasi tulisan", () => {
  it("huruf besar/kecil bebas", () => {
    expectSets("BENCH 70X8", "bench-press", [set(70, 8)]);
  });

  it.each([["bench 70×8"], ["bench 70*8"], ["bench 70 x 8"]])("pemisah %s", (text) => {
    expectSets(text, "bench-press", [set(70, 8)]);
  });

  it("kg nempel di angka", () => {
    expectSets("bench 72.5kg x5", "bench-press", [set(72.5, 5)]);
  });

  it("spasi ganda", () => {
    expectSets("  bench    70x8  ", "bench-press", [set(70, 8)]);
  });

  it("nama latihan lebih dari satu kata + koma desimal", () => {
    expectSets("incline db press 22,5x10", "incline-db-press", [set(22.5, 10)]);
  });

  it("alias yang diawali 'bb' tetap terbaca sebagai nama", () => {
    expectSets("bbrow 60x8", "barbell-row", [set(60, 8)]);
    expectSets("bbc 30x10x2", "barbell-curl", times(2, set(30, 10)));
  });

  it("koma pemisah tanpa spasi", () => {
    expectSets("bench 70x8,70x7", "bench-press", [set(70, 8), set(70, 7)]);
  });

  it("koma desimal dan koma pemisah dalam satu pesan", () => {
    expectSets("bench 70x8, 67,5x8", "bench-press", [set(70, 8), set(67.5, 8)]);
  });

  it("latihan berat badan: rep dipisah koma", () => {
    expectSets("pullup 8,8,7", "pull-up", [set(null, 8), set(null, 8), set(null, 7)]);
  });

  it("beban tambahan pakai koma desimal", () => {
    expectSets("pullup +2,5x6", "pull-up", [set(2.5, 6, { isAdded: true })]);
  });

  it("berat badan satu angka = rep", () => {
    expectSets("pullup 8", "pull-up", [set(null, 8)]);
  });

  it("tanda seru beruntun tetap dianggap gagal", () => {
    expectSets("ohp 40x5!!", "overhead-press", [set(40, 5, { failed: true })]);
  });

  it("gagal hanya di set terakhir pada pesan dengan beberapa bagian", () => {
    expectSets("bench 70x8, 70x6 gagal", "bench-press", [set(70, 8), set(70, 6, { failed: true })]);
  });

  it("latihan belum dikenal → exercise null, set tetap terbaca", () => {
    const result = parse("zercher squat 60x5");
    expect(result).toEqual({ ok: true, name: "zercher squat", exercise: null, sets: [set(60, 5)], continuation: false });
  });
});

describe("findExercise", () => {
  it.each([
    ["bench", "bench-press"],
    ["bench press", "bench-press"],
    ["bench-press", "bench-press"],
    ["BP", "bench-press"],
    ["incline   db  press", "incline-db-press"],
    ["pull up", "pull-up"],
  ])("%s → %s", (name, slug) => {
    expect(findExercise(name, CATALOG)?.slug).toBe(slug);
  });

  it("nama tidak dikenal → null", () => {
    expect(findExercise("xyz", CATALOG)).toBeNull();
    expect(findExercise("", CATALOG)).toBeNull();
  });
});

describe("parseSetMessage: tambahan SPEC v0.1", () => {
  const bench = CATALOG[0];
  const pullup = CATALOG[4];

  it("set dipisah spasi (beban turun tiap set)", () => {
    expectSets("bench 80x5 75x6 70x8", "bench-press", [set(80, 5), set(75, 6), set(70, 8)]);
  });

  it("spasi + koma desimal", () => {
    expectSets("bench 80x5 77,5x6", "bench-press", [set(80, 5), set(77.5, 6)]);
  });

  it("berat badan: rep dipisah spasi", () => {
    expectSets("pullup 8 8 7", "pull-up", [set(null, 8), set(null, 8), set(null, 7)]);
  });

  it("drop set dengan >", () => {
    expectSets("bench 80x5 > 60x10", "bench-press", [set(80, 5), set(60, 10, { isDrop: true })]);
  });

  it("drop set berantai, koma desimal setelah >", () => {
    expectSets("bench 80x5 > 67,5x8 > 50x12", "bench-press", [
      set(80, 5),
      set(67.5, 8, { isDrop: true }),
      set(50, 12, { isDrop: true }),
    ]);
  });

  it("drop set + gagal: hanya set terakhir yang gagal", () => {
    expectSets("bench 80x5 > 60x10 gagal", "bench-press", [set(80, 5), set(60, 10, { isDrop: true, failed: true })]);
  });

  it("> tanpa set setelahnya → salah", () => {
    expect(parse("bench 80x5 >").ok).toBe(false);
  });

  it("tanpa nama → set berikutnya untuk latihan terakhir di sesi", () => {
    const result = parseSetMessage("75x6", CATALOG, { lastExercise: bench });
    expect(result).toEqual({ ok: true, name: "bench press", exercise: bench, sets: [set(75, 6)], continuation: true });
  });

  it("tanpa nama, latihan terakhir berat badan: angka dibaca rep", () => {
    const result = parseSetMessage("8x3", CATALOG, { lastExercise: pullup });
    expect(result.ok && result.sets).toEqual(times(3, set(null, 8)));
  });

  it("tanpa nama dan belum ada latihan di sesi → tetap salah (70x8)", () => {
    expect(parseSetMessage("70x8", CATALOG)).toEqual({ ok: false, reason: "no_name" });
    expect(parseSetMessage("70x8", CATALOG, { lastExercise: null })).toEqual({ ok: false, reason: "no_name" });
  });

  it("latihan dipaksa (dipilih lewat tombol) untuk pesan bernama tak dikenal", () => {
    const result = parseSetMessage("pullap 8x3", CATALOG, { exercise: pullup });
    expect(result.ok && result.exercise?.slug).toBe("pull-up");
    expect(result.ok && result.sets).toEqual(times(3, set(null, 8)));
  });

  it("lain 40x12x3 → latihan lain", () => {
    const withLain = [...CATALOG, { id: 99, slug: "lain", name: "latihan lain", aliases: ["lain"], isBodyweight: false }];
    const result = parseSetMessage("lain 40x12x3", withLain);
    expect(result.ok && result.exercise?.slug).toBe("lain");
  });
});

describe("salah ketik", () => {
  it("levenshtein", () => {
    expect(levenshtein("bnch", "bench")).toBe(1);
    expect(levenshtein("sama", "sama")).toBe(0);
  });

  it.each([
    ["bnch", "bench-press"],
    ["bench pres", "bench-press"],
    ["pul up", "pull-up"],
    ["overhed press", "overhead-press"],
  ])("%s → %s", (typo, slug) => {
    expect(suggestExercise(typo, CATALOG)?.slug).toBe(slug);
  });

  it("terlalu beda atau terlalu pendek → tidak ada saran", () => {
    expect(suggestExercise("zercher", CATALOG)).toBeNull();
    expect(suggestExercise("bx", CATALOG)).toBeNull();
  });
});

describe("latihan durasi & kardio", () => {
  const plank: ExerciseRef = { id: 50, slug: "plank", name: "plank", aliases: ["planking"], isBodyweight: true, kind: "durasi" };
  const treadmill: ExerciseRef = { id: 51, slug: "treadmill", name: "treadmill", aliases: ["tm"], isBodyweight: false, kind: "kardio" };
  const lari: ExerciseRef = { id: 52, slug: "outdoor-run", name: "lari", aliases: ["lari", "run"], isBodyweight: true, kind: "kardio" };
  const cat = [...CATALOG, plank, treadmill, lari];
  const dur = (sec: number, extra: Partial<ParsedSet> = {}) => set(null, 0, { reps: null, durationSec: sec, ...extra });
  const cardio = (sec: number | null, m: number | null) => set(null, 0, { reps: null, durationSec: sec, distanceM: m });
  const sets = (text: string) => {
    const r = parseSetMessage(text, cat);
    return r.ok ? r.sets : r.reason;
  };

  it.each([
    ["plank 60s x3", [dur(60), dur(60), dur(60)]],
    ["plank 60 s x 3", [dur(60), dur(60), dur(60)]],
    ["plank 1m", [dur(60)]],
    ["plank 1,5m", [dur(90)]],
    ["plank 45 dtk", [dur(45)]],
    ["plank 60x3", [dur(60), dur(60), dur(60)]], // angka polos = detik
    ["plank 60s 45s", [dur(60), dur(45)]],
  ])("durasi: %s", (text, expected) => {
    expect(sets(text)).toEqual(expected);
  });

  it.each([
    ["treadmill 20m", [cardio(1200, null)]],
    ["lari 5km 28m", [cardio(1680, 5000)]],
    ["treadmill 30m 4km", [cardio(1800, 4000)]],
    ["lari 5,2 km", [cardio(null, 5200)]],
    ["treadmill 20", [cardio(1200, null)]], // angka polos = menit
    ["tm 1j", [cardio(3600, null)]],
  ])("kardio: %s", (text, expected) => {
    expect(sets(text)).toEqual(expected);
  });

  it.each([["plank abc"], ["treadmill 20m 30m"], ["lari 5km 6km"], ["plank 0s"]])("salah: %s", (text) => {
    expect(parseSetMessage(text, cat).ok).toBe(false);
  });

  it("set tanpa nama ikut jenis latihan terakhir", () => {
    const r = parseSetMessage("45s", cat, { lastExercise: plank });
    expect(r.ok && r.sets).toEqual([dur(45)]);
  });

  it("latihan belum dikenal: durasi/kardio tetap terbaca supaya bisa dicari", () => {
    const r = parseSetMessage("hollow hold 30s x3", cat);
    expect(r.ok && r.exercise).toBeNull();
    expect(r.ok && r.sets.length).toBe(3);
  });

  it("leg press 100x10 → leg press, bukan overhead press lewat alias press", () => {
    const withLegPress = [...cat, { id: 60, slug: "leg-press", name: "leg press", aliases: ["lp"], isBodyweight: false }];
    const r = parseSetMessage("leg press 100x10", withLegPress);
    expect(r.ok && r.exercise?.slug).toBe("leg-press");
  });
});
