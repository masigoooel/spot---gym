import { describe, expect, it } from "vitest";
import {
  adjustDraft,
  compactCard,
  compareSet,
  computeDraft,
  parseQuick,
  renderCard,
  stepLabel,
  weightStepKg,
  type CardInput,
  type CardSet,
} from "./card";

const s = (weightKg: number | null, reps: number, extra: Partial<CardSet> = {}): CardSet => ({
  weightKg,
  isAdded: false,
  reps,
  durationSec: null,
  distanceM: null,
  ...extra,
});
const t = (durationSec: number, distanceM: number | null = null): CardSet => ({
  weightKg: null,
  isAdded: false,
  reps: null,
  durationSec,
  distanceM,
});

describe("angka otomatis (§5.5)", () => {
  it("skenario 3: piramida minggu lalu → minggu ini cukup ✅ catat tiga kali tanpa ubah angka", () => {
    const lastWeek = [s(75, 5), s(72.5, 6), s(70, 7)];
    const today: CardSet[] = [];
    for (let i = 0; i < 3; i++) today.push(computeDraft(lastWeek, today, "pas", 2.5).draft!);
    expect(today).toEqual(lastWeek);
  });

  it("set ke-n tidak ada di sesi sebelumnya → salin set terakhir hari ini", () => {
    const r = computeDraft([s(75, 5), s(72.5, 6), s(70, 7)], [s(75, 5), s(72.5, 6), s(67.5, 8)], null, 2.5);
    expect(r.draft).toEqual(s(67.5, 8));
    expect(r.source.kind).toBe("repeat");
  });

  it("set ke-1 + sesi lalu ringan → +1 langkah (saran)", () => {
    const r = computeDraft([s(60, 8), s(60, 8)], [], "ringan", 2.5);
    expect(r.draft?.weightKg).toBe(62.5);
    expect(r.source.kind).toBe("suggest");
    expect(computeDraft([s(60, 8), s(60, 8)], [s(62.5, 8)], "ringan", 2.5).draft?.weightKg).toBe(60);
  });

  it("belum pernah dicatat → tidak ada draft; setelah satu set diketik, draft = set itu", () => {
    expect(computeDraft([], [], null, 2.5)).toEqual({ draft: null, source: { kind: "none" } });
    expect(computeDraft([], [s(60, 8)], null, 2.5).draft).toEqual(s(60, 8));
  });

  it("tanda gagal tidak ikut ke draft", () => {
    expect(computeDraft([s(80, 5, { failed: true })], [], null, 2.5).draft?.failed).toBeUndefined();
  });
});

describe("langkah ±", () => {
  const opts = { kind: "beban" as const, unit: "kg" as const, isBodyweight: false };

  it("langkah ikut alat & jenis", () => {
    expect(weightStepKg("barbel")).toBe(2.5);
    expect(weightStepKg("smith")).toBe(2.5);
    expect(weightStepKg("dumbel")).toBe(2);
    expect(weightStepKg("mesin")).toBe(5);
    expect(weightStepKg("kabel")).toBe(5);
    expect(stepLabel("w", "beban", "barbel", "lb")).toBe("5 lb");
    expect(stepLabel("w", "beban", "berat badan", "kg", true)).toBe("2,5 kg tambahan");
    expect(stepLabel("t", "durasi", undefined, "kg")).toBe("15 dtk");
    expect(stepLabel("t", "kardio", undefined, "kg")).toBe("5 mnt");
    expect(stepLabel("k", "kardio", undefined, "kg")).toBe("0,5 km");
  });

  it("beban & rep", () => {
    expect(adjustDraft(s(72.5, 6), "w", 1, { ...opts, equipment: "barbel" }).weightKg).toBe(75);
    expect(adjustDraft(s(24, 10), "w", -1, { ...opts, equipment: "dumbel" }).weightKg).toBe(22);
    expect(adjustDraft(s(40, 10), "w", 1, { ...opts, equipment: "mesin" }).weightKg).toBe(45);
    expect(adjustDraft(s(72.5, 6), "r", 1, opts).reps).toBe(7);
    expect(adjustDraft(s(72.5, 1), "r", -1, opts).reps).toBe(1);
    expect(adjustDraft(s(2.5, 6), "w", -1, { ...opts, equipment: "barbel" }).weightKg).toBe(2.5);
  });

  it("lb: langkah 5 lb, disimpan tetap kg", () => {
    const next = adjustDraft(s(45.36, 5), "w", 1, { ...opts, unit: "lb", equipment: "barbel" }).weightKg!;
    expect(Math.round(next * 2.20462262185)).toBe(105);
  });

  it("berat badan: 0 = berat badan, ➕ jadi beban tambahan", () => {
    const bb = { ...opts, isBodyweight: true, equipment: "berat badan" };
    expect(adjustDraft(s(null, 8), "w", 1, bb)).toEqual(s(2.5, 8, { isAdded: true }));
    expect(adjustDraft(s(2.5, 8, { isAdded: true }), "w", -1, bb)).toEqual(s(null, 8));
  });

  it("durasi ±15 dtk, kardio ±5 mnt & ±0,5 km", () => {
    expect(adjustDraft(t(60), "t", 1, { ...opts, kind: "durasi" }).durationSec).toBe(75);
    expect(adjustDraft(t(1200), "t", -1, { ...opts, kind: "kardio" }).durationSec).toBe(900);
    expect(adjustDraft(t(1200, 3000), "k", 1, { ...opts, kind: "kardio" }).distanceM).toBe(3500);
  });
});

describe("ketik cepat (§5.6)", () => {
  it.each([
    ["6", { type: "reps", reps: 6, failed: false }],
    ["6 gagal", { type: "reps", reps: 6, failed: true }],
    ["70 8", { type: "set", weight: 70, reps: 8, failed: false }],
    ["70,5 8!", { type: "set", weight: 70.5, reps: 8, failed: true }],
    ["ok", { type: "ok", count: 1 }],
    ["Y", { type: "ok", count: 1 }],
    ["+", { type: "ok", count: 1 }],
    ["x3", { type: "ok", count: 3 }],
    ["-", { type: "delete" }],
  ])("%s", (text, expected) => {
    expect(parseQuick(text, "beban")).toEqual(expected);
  });

  it("bukan ketik cepat → dibaca parser biasa", () => {
    expect(parseQuick("70x8", "beban")).toBeNull();
    expect(parseQuick("bench 70x8", "beban")).toBeNull();
    expect(parseQuick("75 lima", "beban")).toBeNull();
    expect(parseQuick("0", "beban")).toBeNull();
    expect(parseQuick("60", "durasi")).toBeNull();
    expect(parseQuick("ok", "durasi")).toEqual({ type: "ok", count: 1 });
  });
});

describe("isi kartu (§5.5)", () => {
  const base: CardInput = {
    name: "bench press",
    kind: "beban",
    isBodyweight: false,
    equipment: "barbel",
    unit: "kg",
    split: "push",
    position: 2,
    total: 7,
    yesterday: false,
    today: [s(75, 5)],
    target: 3,
    hasPrevious: true,
    when: "minggu lalu",
    earlierToday: null,
    draft: s(72.5, 6),
    source: { kind: "last", order: 2, set: s(72.5, 6) },
    hasNext: true,
    remaining: 5,
    opening: false,
    previous: [s(75, 5), s(72.5, 6), s(70, 7)],
    allDone: false,
    tips: true,
    notice: null,
    undoable: false,
  };
  const labels = (c: CardInput) => renderCard(c).rows.map((r) => r.map((b) => b.text));

  it("teks persis contoh SPEC", () => {
    expect(renderCard(base).text.split("\n")).toEqual([
      "🏋️ <b>bench press</b> · set 2 dari 3",
      "push · latihan 2 dari 7 hari ini",
      "minggu lalu set 2 kamu 72,5 kg × 6, udah aku isi di bawah.",
      "➡️ <b>72,5 kg × 6</b>",
      "hari ini: ✅ 75×5",
      "💡 ✅ catat = simpan set ini · ➖➕ = ubah angka dulu · ➡️ = pindah latihan · 🏁 = selesai & lihat rekap",
    ]);
  });

  it("tombol urut persis SPEC", () => {
    expect(labels(base)).toEqual([
      ["➖ 2,5 kg", "➕ 2,5 kg"],
      ["➖ 1 rep", "➕ 1 rep"],
      ["✅ catat 72,5 kg × 6"],
      ["↩️ hapus set terakhir"],
      ["➡️ latihan berikutnya"],
      ["🔄 ganti latihan", "🏁 selesai latihan"],
    ]);
    const data = renderCard(base).rows.flat().map((b) => b.data);
    expect(data).toEqual(["c:w-", "c:w+", "c:r-", "c:r+", "c:ok", "c:del", "c:next", "c:swap", "c:fin"]);
  });

  it("kartu tanpa set: tidak ada ↩️ hapus set terakhir", () => {
    expect(labels({ ...base, today: [] }).flat()).not.toContain("↩️ hapus set terakhir");
  });

  it("set ke-4 lewat dari N: 'set 4' tanpa 'dari'", () => {
    expect(renderCard({ ...base, today: [s(75, 5), s(72.5, 6), s(70, 7)] }).text).toContain("· set 4\n");
  });

  it("jumlah set = N: '3 set beres', tombol tetap sama", () => {
    const c = { ...base, today: [s(75, 5), s(72.5, 6), s(70, 7)], draft: s(70, 7), source: { kind: "repeat" as const } };
    expect(renderCard(c).text).toContain(
      "🙌 3 set beres, sama kayak minggu lalu. lanjut latihan apa? tekan ➡️ latihan berikutnya buat pilih dari daftar (masih ada 5 yang belum), atau ketik namanya.",
    );
    expect(renderCard({ ...c, remaining: 1 }).text).toContain("(masih ada 1 yang belum)");
    expect(labels(c).slice(2)).toEqual([
      ["✅ catat 70 kg × 7"],
      ["↩️ hapus set terakhir"],
      ["➡️ latihan berikutnya"],
      ["🔄 ganti latihan", "🏁 selesai latihan"],
    ]);
  });

  it("semua latihan sudah ada set: tanpa ➡️, 🏁 tepat di bawah ✅ catat", () => {
    const c = { ...base, hasNext: false, allDone: true };
    expect(renderCard(c).text).toContain("🎉 semua latihan push hari ini udah beres! tekan 🏁 selesai latihan buat lihat rekap.");
    expect(labels(c).slice(2)).toEqual([
      ["✅ catat 72,5 kg × 6"],
      ["🏁 selesai latihan"],
      ["↩️ hapus set terakhir"],
      ["🔄 ganti latihan"],
    ]);
  });

  it("belum pernah dicatat: minta ketik, tanpa ± dan ✅ catat", () => {
    const c = { ...base, today: [], hasPrevious: false, draft: null, source: { kind: "none" as const } };
    expect(renderCard(c).text).toContain(
      "ini pertama kali kamu nyatet bench press, jadi aku belum bisa nebak angkanya. ketik beban dan rep ya, contoh <code>60x8</code> (artinya 60 kg, 8 rep).",
    );
    expect(labels(c)).toEqual([["➡️ latihan berikutnya"], ["🔄 ganti latihan", "🏁 selesai latihan"]]);
  });

  it("sumber angka: tadi, saran, sudah dikerjakan tadi", () => {
    expect(renderCard({ ...base, when: "tadi" }).text).toContain("tadi set 2 kamu 72,5 kg × 6");
    expect(renderCard({ ...base, today: [], source: { kind: "suggest" } }).text).toContain(
      "saran: +2,5 kg karena minggu lalu kerasa ringan.",
    );
    const earlier = renderCard({ ...base, today: [], earlierToday: [s(100, 8), s(95, 8), s(90, 8)] }).text;
    expect(earlier).toContain("bench press udah kamu kerjain tadi (100×8 · 95×8 · 90×8). mau nambah set?");
  });

  it("pr & hapus set & urungkan", () => {
    expect(renderCard({ ...base, notice: { kind: "pr", text: "🏆 pr baru! naik 2,5 kg dari rekor sebelumnya." } }).text).toContain(
      "🏆 pr baru! naik 2,5 kg dari rekor sebelumnya.",
    );
    const del = { ...base, notice: { kind: "deleted" as const, order: 2, set: s(72.5, 6), other: null }, undoable: true };
    expect(renderCard(del).text).toContain("↩️ set 2 (72,5 kg × 6) udah dihapus.");
    expect(labels(del)).toContainEqual(["↩️ hapus set terakhir", "↩️ urungkan"]);
  });

  it("tag 📅 kemarin di header", () => {
    expect(renderCard({ ...base, yesterday: true }).text.split("\n")[0]).toBe("🏋️ <b>bench press</b> · set 2 dari 3 · 📅 kemarin");
  });

  it("skenario 12: berat badan, durasi, kardio", () => {
    const pullup = { ...base, name: "pull-up", isBodyweight: true, equipment: "berat badan", draft: s(null, 8) };
    expect(labels(pullup).slice(0, 3)).toEqual([
      ["➖ 2,5 kg tambahan", "➕ 2,5 kg tambahan"],
      ["➖ 1 rep", "➕ 1 rep"],
      ["✅ catat berat badan × 8"],
    ]);
    expect(labels({ ...pullup, draft: s(5, 6, { isAdded: true }) })[2]).toEqual(["✅ catat +5 kg × 6"]);
    const plank = { ...base, name: "plank", kind: "durasi" as const, draft: t(60) };
    expect(labels(plank).slice(0, 2)).toEqual([["➖ 15 dtk", "➕ 15 dtk"], ["✅ catat 60 dtk"]]);
    const tread = { ...base, name: "treadmill", kind: "kardio" as const, draft: t(1200, 3000) };
    expect(labels(tread).slice(0, 3)).toEqual([["➖ 5 mnt", "➕ 5 mnt"], ["➖ 0,5 km", "➕ 0,5 km"], ["✅ catat 20 mnt · 3 km"]]);
  });

  it("tanpa kata 'batal' di teks atau tombol", () => {
    const all = [base, { ...base, allDone: true, hasNext: false }, { ...base, undoable: true }];
    for (const c of all) {
      const { text, rows } = renderCard(c);
      expect(text + rows.flat().map((b) => b.text).join(" ")).not.toMatch(/batal/);
    }
  });
});

describe("kartu padat", () => {
  it("✅ nama · set · satuan", () => {
    expect(compactCard("bench press", [s(75, 5), s(72.5, 6), s(70, 7)], "kg")).toBe("✅ bench press · 75×5 · 72,5×6 · 70×7 kg");
    expect(compactCard("plank", [t(60), t(60)], "kg")).toBe("✅ plank · 60 dtk · 60 dtk");
  });
});

describe("interaksi kartu", () => {
  it("reaksi setelah catat: dibanding set yang sama sesi sebelumnya", () => {
    expect(compareSet(s(77.5, 5), s(75, 5), "kg")).toEqual({ kind: "heavier", diff: "2,5 kg" });
    expect(compareSet(s(75, 7), s(75, 5), "kg")).toEqual({ kind: "moreReps", reps: 2 });
    expect(compareSet(s(75, 5), s(75, 5), "kg")).toEqual({ kind: "same" });
    expect(compareSet(s(75, 4), s(75, 5), "kg")).toEqual({ kind: "lower" });
    expect(compareSet(s(70, 5), s(75, 5), "kg")).toEqual({ kind: "lower" });
    expect(compareSet(s(70, 8), s(75, 5), "kg")).toBeNull(); // beban turun tapi rep naik: tidak dinilai
    expect(compareSet(s(75, 5), undefined, "kg")).toBeNull();
    expect(compareSet(t(60), t(45), "kg")).toBeNull();
  });

  it("kartu menulis reaksi setelah ✅ catat", () => {
    const c = (today: CardSet[], extra: Partial<CardInput> = {}) =>
      renderCard({
        name: "bench press", kind: "beban", isBodyweight: false, equipment: "barbel", unit: "kg", split: "push",
        position: 1, total: 7, yesterday: false, today, target: 3, hasPrevious: true, when: "minggu lalu",
        earlierToday: null, draft: s(72.5, 6), source: { kind: "last", order: 2, set: s(72.5, 6) },
        hasNext: true, remaining: 6, opening: false, previous: [s(75, 5), s(72.5, 6), s(70, 7)],
        allDone: false, tips: false, notice: { kind: "logged" }, undoable: false, ...extra,
      }).text;
    expect(c([s(75, 6)])).toContain("set 1 kecatat, 1 rep lebih banyak dari minggu lalu. mantap!");
    expect(c([s(75, 5)])).toContain("set 1 kecatat, sama persis kayak minggu lalu.");
    expect(c([s(75, 5)], { when: "tadi" })).toContain("sama persis kayak sesi tadi.");
    expect(c([s(75, 5)], { previous: [] })).toContain("set 1 kecatat. istirahat dulu ya");
    // set terakhir target: yang tampil "3 set beres", bukan reaksi
    expect(c([s(75, 5), s(72.5, 6), s(70, 7)])).not.toContain("kecatat");
  });

  it("kartu pertama sesi: ajakan mulai menggantikan baris posisi", () => {
    const text = renderCard({
      name: "bench press", kind: "beban", isBodyweight: false, equipment: "barbel", unit: "kg", split: "push",
      position: 1, total: 7, yesterday: false, today: [], target: 3, hasPrevious: true, when: "minggu lalu",
      earlierToday: null, draft: s(75, 5), source: { kind: "last", order: 1, set: s(75, 5) },
      hasNext: true, remaining: 6, opening: true, previous: [s(75, 5)],
      allDone: false, tips: false, notice: null, undoable: false,
    }).text;
    expect(text).toContain("yuk mulai latihan push! hari ini ada 7 latihan, ini yang pertama.");
    expect(text).not.toContain("latihan 1 dari 7");
  });
});
