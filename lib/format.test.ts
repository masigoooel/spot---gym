import { describe, expect, it } from "vitest";
import {
  formatDay,
  formatDayLong,
  formatDayShort,
  formatDistance,
  formatDuration,
  formatKg,
  formatMonthYear,
  formatNumber,
  formatSetChip,
  fromUnit,
  summarizeSets,
  timedExtras,
  toUnit,
} from "./format";

describe("format angka", () => {
  it("desimal koma, ribuan titik", () => {
    expect(formatNumber(72.5)).toBe("72,5");
    expect(formatNumber(5120)).toBe("5.120");
    expect(formatNumber(15505.25)).toBe("15.505,25");
    expect(formatKg(70)).toBe("70 kg");
  });

  it("tanggal di zona waktu user", () => {
    // 21 okt 2026 pukul 20:00 utc = kamis 22 okt pukul 03:00 wib
    const date = new Date("2026-10-21T20:00:00Z");
    expect(formatDay(date, "Asia/Jakarta")).toBe("22 okt");
    expect(formatDayShort(date, "Asia/Jakarta")).toBe("kam, 22 okt");
    expect(formatDayLong(date, "Asia/Jakarta")).toBe("kamis, 22 oktober");
    expect(formatMonthYear(date, "Asia/Jakarta")).toBe("oktober 2026");
  });
});

describe("satuan", () => {
  it("kg → lb untuk tampilan, dibulatkan 0,1", () => {
    expect(formatKg(72.5, "lb")).toBe("159,8 lb");
    expect(formatKg(72.5, "kg")).toBe("72,5 kg");
  });

  it("input lb disimpan sebagai kg", () => {
    expect(fromUnit(160, "lb")).toBe(72.57);
    expect(toUnit(fromUnit(160, "lb"), "lb")).toBe(160);
    expect(fromUnit(70, "kg")).toBe(70);
  });

  it("chip set", () => {
    expect(formatSetChip({ weightKg: 72.5, isAdded: false, reps: 5 }, "kg")).toBe("72,5 × 5");
    expect(formatSetChip({ weightKg: null, isAdded: false, reps: 20 }, "kg")).toBe("bb × 20");
    expect(formatSetChip({ weightKg: 10, isAdded: true, reps: 6 }, "kg")).toBe("+10 × 6");
  });
});

describe("summarizeSets", () => {
  const s = (weightKg: number | null, reps: number, isAdded = false) => ({ weightKg, isAdded, reps });

  it("set sama digabung", () => {
    expect(summarizeSets([s(72.5, 5), s(72.5, 5), s(72.5, 5)])).toBe("72,5 kg × 5 × 3");
  });

  it("set berbeda dipisah koma", () => {
    expect(summarizeSets([s(70, 8), s(70, 7), s(67.5, 8)])).toBe("70 kg × 8, 70 kg × 7, 67,5 kg × 8");
  });

  it("berat badan dan beban tambahan", () => {
    expect(summarizeSets([s(null, 8), s(null, 8)])).toBe("berat badan × 8 × 2");
    expect(summarizeSets([s(10, 6, true)])).toBe("+10 kg × 6");
  });
});

describe("chip drop set", () => {
  it("drop set diberi tanda", () => {
    expect(formatSetChip({ weightKg: 60, isAdded: false, reps: 10, isDrop: true }, "kg")).toBe("drop 60 × 10");
  });
});

describe("durasi & jarak", () => {
  it("di bawah 3 menit tetap detik", () => {
    expect(formatDuration(60)).toBe("60 dtk");
    expect(formatDuration(179)).toBe("179 dtk");
  });

  it("menit dan jam", () => {
    expect(formatDuration(1200)).toBe("20 mnt");
    expect(formatDuration(210)).toBe("3 mnt 30 dtk");
    expect(formatDuration(3900)).toBe("1 j 5 mnt");
    expect(formatDuration(7200)).toBe("2 j");
  });

  it("jarak dalam km", () => {
    expect(formatDistance(5000)).toBe("5 km");
    expect(formatDistance(5200)).toBe("5,2 km");
  });

  it("chip dan ringkasan set durasi/kardio", () => {
    const t = (durationSec: number, distanceM: number | null = null) => ({
      weightKg: null,
      isAdded: false,
      reps: null,
      durationSec,
      distanceM,
    });
    expect(formatSetChip(t(60), "kg")).toBe("60 dtk");
    expect(formatSetChip(t(1680, 5000), "kg")).toBe("28 mnt · 5 km");
    expect(summarizeSets([t(60), t(60), t(60)])).toBe("60 dtk × 3");
  });
});

describe("baris tambahan rekap", () => {
  const x = (name: string, kind: string, durationSec: number | null, distanceM: number | null = null) => ({
    name,
    kind,
    durationSec,
    distanceM,
  });

  it("kardio dijumlah, durasi per latihan", () => {
    expect(timedExtras([x("treadmill", "kardio", 1200), x("plank", "durasi", 60), x("plank", "durasi", 60), x("plank", "durasi", 60)])).toEqual([
      "20 mnt kardio",
      "plank 3 × 60 dtk",
    ]);
  });

  it("jarak kardio dan durasi yang beda-beda", () => {
    expect(timedExtras([x("lari", "kardio", 1680, 5000), x("plank", "durasi", 60), x("plank", "durasi", 45)])).toEqual([
      "28 mnt kardio (5 km)",
      "plank 60 dtk, 45 dtk",
    ]);
  });

  it("durasi sama yang berurutan digabung", () => {
    const p = (sec: number) => x("plank", "durasi", sec);
    expect(timedExtras([p(60), p(60), p(60), p(75), p(75)])).toEqual(["plank 3 × 60 dtk, 2 × 75 dtk"]);
  });

  it("tanpa set durasi/kardio kosong", () => {
    expect(timedExtras([])).toEqual([]);
  });
});
