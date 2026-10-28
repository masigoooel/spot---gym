import { describe, expect, it } from "vitest";
import { formatCount, itemsInRange, pickOtherSetara, pickSetara } from "./setara";

describe("formatCount", () => {
  it("n < 1 → 1/x", () => {
    expect(formatCount(5120 / 150000)).toBe("1/29"); // contoh spec: 1/29 paus biru
  });

  it("n < 2 → satu desimal", () => {
    expect(formatCount(1.5)).toBe("1,5");
    expect(formatCount(1.04)).toBe("1");
  });

  it("selain itu dibulatkan ke bawah, ribuan pakai titik", () => {
    expect(formatCount(4.27)).toBe("4");
    expect(formatCount(1280.9)).toBe("1.280");
  });

  it("hampir 1 tidak jadi 1/1", () => {
    expect(formatCount(0.9)).toBe("0,9");
  });
});

describe("pickSetara", () => {
  const first = () => 0;

  it("mode otomatis hanya pilih benda dengan 1 ≤ n ≤ 50", () => {
    const ids = itemsInRange(5120).map((i) => i.id);
    expect(ids).toEqual(["motor", "piano", "sapi", "badak", "mobil", "gajah"]);
    for (let r = 0; r < 1; r += 0.05) {
      const s = pickSetara(5120, { mode: "auto", random: () => r })!;
      expect(ids).toContain(s.item.id);
      expect(s.count).toBeGreaterThanOrEqual(1);
      expect(s.count).toBeLessThanOrEqual(50);
    }
  });

  it("tidak sama dengan rekap sebelumnya", () => {
    expect(pickSetara(5120, { mode: "auto", previousId: "motor", random: first })!.item.id).toBe("piano");
  });

  it("kalau cuma satu pilihan, boleh sama dengan sebelumnya", () => {
    // 3 kg: hanya durian (1,5) yang masuk rentang
    expect(pickSetara(3, { mode: "auto", previousId: "durian", random: first })!.item.id).toBe("durian");
  });

  it("mode kunci selalu pakai benda pilihan user", () => {
    const s = pickSetara(5120, { mode: "lock", lockedId: "paus" })!;
    expect(s.item.id).toBe("paus");
    expect(formatCount(s.count)).toBe("1/29");
  });

  it("di luar semua rentang pakai benda paling ringan / paling berat", () => {
    expect(pickSetara(1, { mode: "auto" })!.item.id).toBe("durian");
    expect(pickSetara(10_000_000, { mode: "auto" })!.item.id).toBe("paus");
  });

  it("volume 0 → tidak ada setara", () => {
    expect(pickSetara(0, { mode: "auto" })).toBeNull();
  });
});

describe("pickOtherSetara", () => {
  it("pilih benda lain dalam rentang", () => {
    expect(pickOtherSetara(5120, "motor", () => 0)!.item.id).toBe("piano");
  });

  it("null kalau tidak ada pilihan lain", () => {
    expect(pickOtherSetara(3, "durian")).toBeNull();
  });
});
