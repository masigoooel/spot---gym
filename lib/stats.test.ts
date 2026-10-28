import { describe, expect, it } from "vitest";
import {
  daysBetween,
  heatmap,
  lastWeeks,
  neglectedSplit,
  percentChange,
  repRecords,
  weeklyMax,
} from "./stats";

// jadwal bawaan: senin pull, selasa legs, kamis push. 26 okt 2026 = senin.
const schedule = { "1": "pull", "2": "legs", "4": "push" };

describe("tanggal", () => {
  it("selisih hari", () => {
    expect(daysBetween("2026-10-20", "2026-10-26")).toBe(6);
  });

  it("n minggu terakhir, senin, dari yang paling lama", () => {
    expect(lastWeeks("2026-10-28", 3)).toEqual(["2026-10-12", "2026-10-19", "2026-10-26"]);
  });
});

describe("neglectedSplit", () => {
  it("split terjadwal yang paling lama ditinggal", () => {
    const sessions = [
      { split: "pull", date: "2026-10-26" },
      { split: "legs", date: "2026-10-20" },
      { split: "push", date: "2026-10-22" },
    ];
    expect(neglectedSplit(sessions, schedule, "2026-10-26")).toEqual({ split: "legs", days: 6 });
  });

  it("semua baru dilatih → null", () => {
    const sessions = [
      { split: "pull", date: "2026-10-26" },
      { split: "legs", date: "2026-10-25" },
      { split: "push", date: "2026-10-24" },
    ];
    expect(neglectedSplit(sessions, schedule, "2026-10-26")).toBeNull();
  });
});

describe("weeklyMax", () => {
  it("beban terberat per minggu, null kalau tidak dilatih", () => {
    const weeks = ["2026-10-12", "2026-10-19", "2026-10-26"];
    const points = [
      { date: "2026-10-12", kg: 70 },
      { date: "2026-10-15", kg: 72.5 },
      { date: "2026-10-26", kg: 75 },
    ];
    expect(weeklyMax(points, weeks)).toEqual([72.5, null, 75]);
  });
});

describe("heatmap", () => {
  it("84 sel, urut per minggu, level dari sepertiga volume", () => {
    const days = [
      { date: "2026-10-19", volume: 1000 },
      { date: "2026-10-20", volume: 3000 },
      { date: "2026-10-22", volume: 5000 },
      { date: "2026-10-22", volume: 0 }, // dua sesi di hari yang sama
    ];
    const cells = heatmap(days, "2026-10-26", 12);
    expect(cells).toHaveLength(84);
    expect(cells[0].date).toBe("2026-08-10"); // senin, 11 minggu sebelum minggu ini
    const at = (d: string) => cells.find((c) => c.date === d)!;
    expect(at("2026-10-19").level).toBe(1);
    expect(at("2026-10-20").level).toBe(2);
    expect(at("2026-10-22")).toMatchObject({ level: 3, sessions: 2, volume: 5000 });
    expect(at("2026-10-21").level).toBe(0);
    expect(at("2026-10-27").future).toBe(true);
  });
});

describe("repRecords", () => {
  it("beban terberat per jumlah rep + perkiraan 1rm terbaik", () => {
    const sets = [
      { weightKg: 70, reps: 6, failed: false, date: "2026-10-19" },
      { weightKg: 72.5, reps: 5, failed: false, date: "2026-10-22" },
      { weightKg: 67.5, reps: 6, failed: false, date: "2026-10-15" },
      { weightKg: 75, reps: 1, failed: true, date: "2026-10-22" }, // gagal, 0 rep berhasil
      { weightKg: null, reps: 10, failed: false, date: "2026-10-22" },
    ];
    expect(repRecords(sets)).toEqual({
      bestE1rm: 84.6,
      byReps: [
        { reps: 5, weightKg: 72.5, date: "2026-10-22" },
        { reps: 6, weightKg: 70, date: "2026-10-19" },
      ],
    });
  });
});

describe("percentChange", () => {
  it("dibulatkan, null tanpa pembanding", () => {
    expect(percentChange(15505, 14357)).toBe(8);
    expect(percentChange(100, 0)).toBeNull();
  });
});
