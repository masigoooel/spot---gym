// pencocokan nama latihan yang longgar (SPEC §4 "Pencocokan nama yang longgar").
// murni, tanpa i/o: dipakai parser (bot) dan kolom cari di web, dengan normalisasi yang sama persis.

export type Matchable = { id: number; slug: string; name: string; aliases: string[] };

// sinonim per kata (setelah huruf kecil & tanda baca jadi spasi)
const SYNONYMS: Record<string, string> = {
  dumbbell: "db",
  dumbbells: "db",
  dumbell: "db",
  dumbells: "db",
  dumbel: "db",
  barbell: "barbel",
  barbells: "barbel",
  machine: "mesin",
  mc: "mesin",
  cable: "kabel",
  cables: "kabel",
  ezbar: "ez",
  flyes: "fly",
  flies: "fly",
};

// buang akhiran jamak: raises → raise, presses → press, curls → curl (press, plus, statis tetap)
function singular(word: string): string {
  if (word.endsWith("ss")) return word;
  if (/(sses|xes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !/(us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

// teks → daftar kata yang sudah dinormalisasi. petik dibuang (`captain's` = `captains`), tanda baca lain jadi spasi
export function normalizeWords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[-_./]/g, " ")
    .replace(/\bez bar\b/g, "ez")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.map((w) => {
    const s = SYNONYMS[w] ?? w;
    return SYNONYMS[singular(s)] ?? singular(s);
  });
}

export const normalizeKey = (text: string) => normalizeWords(text).join(" ");

type Key = { exercise: Matchable; spaced: string; nospace: string; sorted: string };
type Index = { keys: Key[] };

const cache = new WeakMap<readonly Matchable[], Index>();

function indexOf(catalog: readonly Matchable[]): Index {
  let index = cache.get(catalog);
  if (!index) {
    const keys: Key[] = [];
    for (const exercise of catalog) {
      const texts = new Set([exercise.name, exercise.slug, ...exercise.aliases]);
      for (const text of texts) {
        const words = normalizeWords(text);
        if (words.length === 0) continue;
        keys.push({
          exercise,
          spaced: words.join(" "),
          nospace: words.join(""),
          sorted: [...words].sort().join(" "),
        });
      }
    }
    index = { keys };
    cache.set(catalog, index);
  }
  return index;
}

export function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// 1 = sama persis, 0 = beda total
export const similarity = (a: string, b: string) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

// langkah 1–3: persis (dengan/tanpa spasi) → urutan kata bebas → alias terpanjang yang jadi awalan
export function matchExercise<T extends Matchable>(text: string, catalog: readonly T[]): T | null {
  const words = normalizeWords(text);
  if (words.length === 0) return null;
  const spaced = words.join(" ");
  const nospace = words.join("");
  const sorted = [...words].sort().join(" ");
  const { keys } = indexOf(catalog);

  const exact = keys.find((k) => k.spaced === spaced) ?? keys.find((k) => k.nospace === nospace);
  if (exact) return exact.exercise as T;

  // semua kata sama, urutan beda: lebih kuat dari awalan (`pulldown close grip` bukan lat pulldown)
  const anyOrder = words.length > 1 ? keys.find((k) => k.sorted === sorted) : undefined;
  if (anyOrder) return anyOrder.exercise as T;

  let prefix: Key | null = null;
  for (const k of keys) {
    if (k.spaced.length >= 3 && spaced.startsWith(`${k.spaced} `) && (!prefix || k.spaced.length > prefix.spaced.length)) {
      prefix = k;
    }
  }
  return (prefix?.exercise as T) ?? null;
}

const TYPO_MIN = 0.6;
const TYPO_SPREAD = 0.1; // kandidat lain ikut ditampilkan kalau kemiripannya dekat dengan yang terbaik

// langkah 4–5: kandidat salah ketik (1–4 latihan), paling mirip dulu
export function typoCandidates<T extends Matchable>(text: string, catalog: readonly T[], max = 4): T[] {
  const nospace = normalizeWords(text).join("");
  if (nospace.length < 3) return [];
  const best = new Map<number, { exercise: T; score: number }>();
  for (const k of indexOf(catalog).keys) {
    // kunci yang terlalu pendek (`bp`, `lp`) gampang mirip apa saja
    if (k.nospace.length < 3) continue;
    const score = similarity(nospace, k.nospace);
    if (score < TYPO_MIN) continue;
    const cur = best.get(k.exercise.id);
    if (!cur || score > cur.score) best.set(k.exercise.id, { exercise: k.exercise as T, score });
  }
  const ranked = [...best.values()].sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return [];
  return ranked
    .filter((r) => r.score >= ranked[0].score - TYPO_SPREAD)
    .slice(0, max)
    .map((r) => r.exercise);
}

// untuk kolom cari di web: latihan yang namanya mengandung semua kata yang diketik
export function searchExercises<T extends Matchable>(text: string, catalog: readonly T[]): T[] {
  const words = normalizeWords(text);
  if (words.length === 0) return [...catalog];
  const { keys } = indexOf(catalog);
  const hits = new Set<T>();
  for (const k of keys) {
    if (words.every((w) => k.spaced.includes(w))) hits.add(k.exercise as T);
  }
  return catalog.filter((e) => hits.has(e));
}
