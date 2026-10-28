import { describe, expect, it } from "vitest";
import {
  detectPr,
  e1rm,
  isoWeekday,
  localDate,
  scheduledSplit,
  sessionVolume,
  setVolume,
  longestStreak,
  nextScheduledDay,
  nextTrainingDay,
  plannedSplit,
  streakDays,
  suggestLoads,
  buildSchedule,
  weekPlan,
  weekStart,
} from "./workout";

describe("volume", () => {
  it("berat × rep", () => {
    expect(setVolume({ weightKg: 72.5, isAdded: false, reps: 5 })).toBe(362.5);
  });

  it("berat badan dan beban tambahan tidak dihitung", () => {
    expect(setVolume({ weightKg: null, isAdded: false, reps: 8 })).toBe(0);
    expect(setVolume({ weightKg: 10, isAdded: true, reps: 6 })).toBe(0);
  });

  it("volume sesi = jumlah volume set", () => {
    const sets = [
      { weightKg: 72.5, isAdded: false, reps: 5 },
      { weightKg: 72.5, isAdded: false, reps: 5 },
      { weightKg: null, isAdded: false, reps: 8 },
      { weightKg: 0.1, isAdded: false, reps: 3 },
    ];
    expect(sessionVolume(sets)).toBe(725.3);
  });
});

describe("e1rm (epley)", () => {
  it("dibulatkan 0,1 kg", () => {
    expect(e1rm(72.5, 5)).toBe(84.6); // 72,5 × (1 + 5/30) = 84,58
    expect(e1rm(100, 1)).toBe(103.3);
  });
});

describe("detectPr", () => {
  const s = (weightKg: number | null, reps: number, failed = false) => ({ weightKg, isAdded: false, reps, failed });

  it("berat lebih besar dari semua set sebelumnya", () => {
    expect(detectPr(70, [s(72.5, 5)])).toEqual({
      index: 0,
      weightKg: 72.5,
      reps: 5,
      e1rm: 84.6,
      previousWeightKg: 70,
    });
  });

  it("sama berat bukan pr", () => {
    expect(detectPr(72.5, [s(72.5, 8)])).toBeNull();
  });

  it("set pertama di latihan jadi patokan, bukan pr", () => {
    expect(detectPr(null, [s(60, 5)])).toBeNull();
  });

  it("satu pesan satu pr: set terberat", () => {
    expect(detectPr(70, [s(72.5, 3), s(75, 1), s(72.5, 2)])?.index).toBe(1);
  });

  it("set gagal tetap boleh pr kalau ada rep yang berhasil", () => {
    expect(detectPr(70, [s(75, 3, true)])).toMatchObject({ weightKg: 75, reps: 2 });
    expect(detectPr(70, [s(75, 1, true)])).toBeNull();
  });

  it("set berat badan diabaikan", () => {
    expect(detectPr(10, [s(null, 8)])).toBeNull();
  });
});

describe("tanggal & jadwal", () => {
  // minggu 25 okt 2026 pukul 20:00 utc = senin 26 okt pukul 03:00 wib
  const date = new Date("2026-10-25T20:00:00Z");

  it("hari dihitung di zona waktu user", () => {
    expect(localDate(date, "Asia/Jakarta")).toBe("2026-10-26");
    expect(isoWeekday(date, "Asia/Jakarta")).toBe(1);
    expect(isoWeekday(date, "UTC")).toBe(7);
  });

  it("split diambil dari jadwal, null kalau libur", () => {
    const schedule = { "1": "pull", "2": "legs", "4": "push" };
    expect(scheduledSplit(schedule, date, "Asia/Jakarta")).toBe("pull");
    expect(scheduledSplit(schedule, date, "UTC")).toBeNull();
  });

  it("awal minggu = senin", () => {
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // minggu
  });
});

// jadwal bawaan: senin pull, selasa legs, kamis push. 26 okt 2026 = senin.
const schedule = { "1": "pull", "2": "legs", "4": "push" };

describe("streakDays (ikut jadwal + jatah libur)", () => {
  const base = { schedule, today: "2026-10-26" };

  it("belum pernah latihan → 0", () => {
    expect(streakDays({ ...base, sessionDates: [] })).toBe(0);
  });

  it("hanya hari jadwal yang ada sesinya yang dihitung; hari bukan jadwal dilewati", () => {
    // sen 19, sel 20, kam 22, sen 26 → 4 (rab, jum, sab, min tidak dihitung)
    const dates = ["2026-10-19", "2026-10-20", "2026-10-22", "2026-10-26"];
    expect(streakDays({ ...base, sessionDates: dates })).toBe(4);
  });

  it("jadwal kelewat memutus streak", () => {
    // sel 20 terjadwal tapi kosong
    const dates = ["2026-10-19", "2026-10-22", "2026-10-26"];
    expect(streakDays({ ...base, sessionDates: dates })).toBe(2);
  });

  it("hari ini terjadwal tapi belum latihan belum memutus", () => {
    const dates = ["2026-10-19", "2026-10-20", "2026-10-22"];
    expect(streakDays({ ...base, sessionDates: dates })).toBe(3);
  });

  it("libur dalam jatah tidak memutus, libur kedua di minggu yang sama memutus", () => {
    const dates = ["2026-10-19", "2026-10-26"];
    const satuLibur = { "2026-10-20": "libur" as const, "2026-10-22": "geser" as const };
    expect(streakDays({ ...base, sessionDates: dates, statuses: satuLibur })).toBe(2);

    const duaLibur = { "2026-10-20": "libur" as const, "2026-10-22": "libur" as const };
    expect(streakDays({ ...base, sessionDates: dates, statuses: duaLibur })).toBe(1);
    expect(streakDays({ ...base, sessionDates: dates, statuses: duaLibur, restAllowance: 2 })).toBe(2);
  });

  it("jadwal yang digeser tidak dihitung kelewat", () => {
    const dates = ["2026-10-19", "2026-10-22", "2026-10-26"];
    expect(streakDays({ ...base, sessionDates: dates, statuses: { "2026-10-20": "geser" } })).toBe(3);
  });

  it("latihan ekstra di hari bukan jadwal ikut menambah", () => {
    const dates = ["2026-10-22", "2026-10-24", "2026-10-26"]; // sab 24 bukan jadwal
    expect(streakDays({ ...base, sessionDates: dates })).toBe(3);
  });

  it("status kelewat selalu memutus", () => {
    const dates = ["2026-10-19", "2026-10-26"];
    expect(streakDays({ ...base, sessionDates: dates, statuses: { "2026-10-22": "kelewat", "2026-10-20": "geser" } })).toBe(1);
  });
});

describe("longestStreak", () => {
  it("rentang terpanjang walau streak sekarang sudah putus", () => {
    // 5–15 okt lengkap (6 sesi), sen 19 kelewat, lalu kam 22 + sen 26
    const dates = ["2026-10-05", "2026-10-06", "2026-10-08", "2026-10-12", "2026-10-13", "2026-10-15", "2026-10-22", "2026-10-26"];
    expect(longestStreak({ sessionDates: dates, schedule, today: "2026-10-26" })).toBe(6);
  });
});

describe("rencana minggu & /geser", () => {
  const monday = "2026-10-26";

  it("tanpa geser = jadwal biasa", () => {
    expect(weekPlan(monday, schedule)).toMatchObject({ "2026-10-26": "pull", "2026-10-27": "legs", "2026-10-29": "push" });
  });

  it("geser senin: pull pindah ke selasa, legs ke kamis, push terdorong lewat minggu", () => {
    const plan = weekPlan(monday, schedule, { "2026-10-26": "geser" });
    expect(plan).toMatchObject({ "2026-10-26": null, "2026-10-27": "pull", "2026-10-29": "legs" });
    expect(Object.values(plan)).not.toContain("push");
  });

  it("split untuk satu tanggal", () => {
    expect(plannedSplit("2026-10-27", schedule, { "2026-10-26": "geser" })).toBe("pull");
    expect(plannedSplit("2026-10-28", schedule)).toBeNull();
  });

  it("hari latihan berikutnya di minggu yang sama", () => {
    expect(nextTrainingDay("2026-10-26", schedule)).toBe("2026-10-27");
    expect(nextTrainingDay("2026-10-27", schedule)).toBe("2026-10-29");
    expect(nextTrainingDay("2026-10-29", schedule)).toBeNull();
  });

  it("jadwal berikutnya untuk penutup rekap (boleh lewat minggu)", () => {
    expect(nextScheduledDay("2026-10-26", schedule)).toEqual({ day: "2026-10-27", split: "legs", inDays: 1 });
    expect(nextScheduledDay("2026-10-29", schedule)).toEqual({ day: "2026-11-02", split: "pull", inDays: 4 });
    expect(nextScheduledDay("2026-10-29", {})).toBeNull();
  });
});

describe("saran beban", () => {
  it("ringan → naik dulu, pas → sama dulu, berat → sama atau turun", () => {
    expect(suggestLoads(72.5, "ringan", "barbel")).toEqual([75, 72.5]);
    expect(suggestLoads(20, "ringan", "dumbel")).toEqual([22, 20]);
    expect(suggestLoads(72.5, "pas")).toEqual([72.5, 75]);
    expect(suggestLoads(72.5, null)).toEqual([72.5, 75]);
    expect(suggestLoads(72.5, "berat")).toEqual([72.5, 70]);
  });
});

describe("kenalan: program → jadwal", () => {
  it("split dibagi berurutan ke hari yang dipilih", () => {
    expect(buildSchedule("ppl", [6, 1, 3, 5])).toEqual({ "1": "push", "3": "pull", "5": "legs", "6": "push" });
    expect(buildSchedule("upper_lower", [1, 2, 4, 5])).toEqual({ "1": "upper", "2": "lower", "4": "upper", "5": "lower" });
    expect(buildSchedule("ppl_ul", [1, 2, 3, 5, 6])).toEqual({ "1": "push", "2": "pull", "3": "legs", "5": "upper", "6": "lower" });
    expect(buildSchedule("full_body", [1, 3, 5])).toEqual({ "1": "full", "3": "full", "5": "full" });
  });
});
