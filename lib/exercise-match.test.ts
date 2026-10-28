import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matchExercise, normalizeKey, searchExercises, typoCandidates } from "./exercise-match";
import { parseSetMessage, type ExerciseRef } from "./parser";

// katalog asli dari supabase/seed.sql, supaya test memakai nama & alias yang sama dengan bot
function seedCatalog(): ExerciseRef[] {
  const sql = readFileSync(join(__dirname, "..", "supabase", "seed.sql"), "utf8");
  const row = /^\('([^']+)',\s*'((?:[^']|'')+)',\s*array\[([^\]]*)\](?:::text\[\])?,\s*'([^']+)',\s*'([^']+)',\s*array\[[^\]]*\](?:::text\[\])?,\s*(true|false),\s*'(\w+)'\)/gm;
  const out: ExerciseRef[] = [];
  let m: RegExpExecArray | null;
  let id = 1;
  while ((m = row.exec(sql))) {
    out.push({
      id: id++,
      slug: m[1],
      name: m[2].replace(/''/g, "'"),
      aliases: [...m[3].matchAll(/'((?:[^']|'')*)'/g)].map((a) => a[1].replace(/''/g, "'")),
      muscle: m[4],
      equipment: m[5],
      isBodyweight: m[6] === "true",
      kind: m[7] as ExerciseRef["kind"],
    });
  }
  return out;
}

const CATALOG = seedCatalog();
const slugOf = (text: string) => {
  const r = parseSetMessage(text, CATALOG);
  return r.ok ? (r.exercise?.slug ?? null) : `gagal:${r.reason}`;
};

describe("katalog seed", () => {
  it("semua 268 latihan terbaca", () => {
    expect(CATALOG.length).toBe(268);
  });
});

describe("tidak ada nama yang bentrok", () => {
  it("nama tiap latihan dikenali sebagai dirinya sendiri", () => {
    const wrong = CATALOG.filter((e) => matchExercise(e.name, CATALOG)?.slug !== e.slug).map(
      (e) => `${e.name} → ${matchExercise(e.name, CATALOG)?.slug}`,
    );
    expect(wrong).toEqual([]);
  });
});

describe("normalisasi", () => {
  it("huruf kecil, tanda baca jadi spasi, spasi ganda", () => {
    expect(normalizeKey("  Close-Grip   Pulldown ")).toBe("close grip pulldown");
    expect(normalizeKey("captain's chair")).toBe("captain chair");
  });

  it("sinonim alat", () => {
    expect(normalizeKey("dumbbell press")).toBe("db press");
    expect(normalizeKey("dumbell press")).toBe("db press");
    expect(normalizeKey("machine row")).toBe("mesin row");
    expect(normalizeKey("cable fly")).toBe("kabel fly");
    expect(normalizeKey("ez-bar curl")).toBe("ez curl");
    expect(normalizeKey("barbell row")).toBe("barbel row");
  });

  it("jamak dibuang, kata yang memang berakhiran s tetap", () => {
    expect(normalizeKey("lateral raises")).toBe("lateral raise");
    expect(normalizeKey("bench presses")).toBe("bench press");
    expect(normalizeKey("lunges")).toBe("lunge");
    expect(normalizeKey("cable crunches")).toBe("kabel crunch");
    expect(normalizeKey("bench press")).toBe("bench press");
    expect(normalizeKey("sepeda statis")).toBe("sepeda statis");
  });
});

describe("pencocokan nama longgar (daftar wajib SPEC §4)", () => {
  it.each([
    ["close grip pulldown 55x10", "close-grip-pulldown"],
    ["closegrip pulldown 55x10", "close-grip-pulldown"],
    ["Close-Grip Pulldown 55x10", "close-grip-pulldown"],
    ["pulldown close grip 55x10", "close-grip-pulldown"],
    ["pullup 8x3", "pull-up"],
    ["pull up 8x3", "pull-up"],
    ["dumbell press 30x10", "db-press"],
    ["incline dumbbell press 24x10", "incline-db-press"],
    ["lateral raises 10x15", "lateral-raise"],
    ["skullcrusher 30x10", "skull-crusher"],
    ["hip thrusts 100x10", "hip-thrust"],
    ["seated wide-grip row 50x12", "wide-grip-seated-row"],
  ])("%s → %s", (text, slug) => {
    expect(slugOf(text)).toBe(slug);
  });

  it("benc pres 70x8 → tidak langsung dicatat, tapi dikonfirmasi: bench press?", () => {
    const r = parseSetMessage("benc pres 70x8", CATALOG);
    expect(r.ok && r.exercise).toBe(null);
    expect(typoCandidates("benc pres", CATALOG)[0]?.slug).toBe("bench-press");
  });

  it("alias terpanjang menang: leg press bukan overhead press (alias `press`)", () => {
    expect(slugOf("leg press 100x10")).toBe("leg-press");
    expect(slugOf("press 40x8")).toBe("overhead-press");
  });

  it("nama yang tidak mirip apa pun tidak ditebak", () => {
    expect(matchExercise("zzz qqq", CATALOG)).toBeNull();
    expect(typoCandidates("zzzqqq", CATALOG)).toEqual([]);
    expect(typoCandidates("bx", CATALOG)).toEqual([]);
  });

  it("kandidat salah ketik maks. 4, paling mirip dulu", () => {
    const c = typoCandidates("pres", CATALOG);
    expect(c.length).toBeGreaterThan(0);
    expect(c.length).toBeLessThanOrEqual(4);
  });

  it("alias pribadi dikenali", () => {
    const own = CATALOG.map((e) => (e.slug === "bench-press" ? { ...e, aliases: [...e.aliases, "benc pres"] } : e));
    expect(matchExercise("benc pres", own)?.slug).toBe("bench-press");
  });
});

describe("kolom cari web", () => {
  it("semua kata harus ada, normalisasi sama", () => {
    const hits = searchExercises("dumbbell row", CATALOG).map((e) => e.slug);
    expect(hits).toContain("db-row");
    expect(hits).not.toContain("barbell-row");
  });
});
