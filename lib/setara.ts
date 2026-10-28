// lib/setara.ts — daftar benda & pemilih otomatis (SPEC §6 "setara dengan")

export const ITEMS = [
  { id: "durian",    label: "durian",          kg: 2,      group: "ringan",   quip: "jangan dicium semua." },
  { id: "kucing",    label: "kucing",          kg: 4,      group: "ringan",   quip: "kucingnya gak ikut diangkat." },
  { id: "galon",     label: "galon air",       kg: 19,     group: "ringan",   quip: "stok air sebulan aman." },
  { id: "beras",     label: "karung beras",    kg: 25,     group: "ringan",   quip: "stok beras satu RT." },
  { id: "kulkas",    label: "kulkas",          kg: 60,     group: "menengah", quip: "isinya belum diitung." },
  { id: "komodo",    label: "komodo",          kg: 70,     group: "menengah", quip: "untung komodonya diem." },
  { id: "orangutan", label: "orangutan",       kg: 80,     group: "menengah", quip: "mereka lebih kuat sih, tapi tetep." },
  { id: "motor",     label: "motor matic",     kg: 110,    group: "menengah", quip: "parkiran penuh." },
  { id: "piano",     label: "piano",           kg: 230,    group: "menengah", quip: "tanpa main satu lagu pun." },
  { id: "sapi",      label: "sapi bali",       kg: 350,    group: "menengah", quip: "sapinya santai aja." },
  { id: "badak",     label: "badak sumatera",  kg: 700,    group: "berat",    quip: "badaknya cuma kaget." },
  { id: "mobil",     label: "mobil",           kg: 1200,   group: "berat",    quip: "aku cuma nonton." },
  { id: "gajah",     label: "gajah sumatera",  kg: 3500,   group: "berat",    quip: "gajahnya aman kok." },
  { id: "paus",      label: "paus biru",       kg: 150000, group: "berat",    quip: "pelan-pelan, pausnya kita kejar." },
] as const;

export type Item = (typeof ITEMS)[number];

const MIN_COUNT = 1;
const MAX_COUNT = 50;

const ONE_DECIMAL = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const WHOLE = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function findItem(id: string): Item | null {
  return ITEMS.find((i) => i.id === id) ?? null;
}

// n < 1 → `1/x`, n < 2 → satu desimal, selain itu dibulatkan ke bawah
export function formatCount(n: number): string {
  if (n < 1) {
    const x = Math.round(1 / n);
    if (x > 1) return `1/${x}`;
  }
  if (n < 2) return ONE_DECIMAL.format(n);
  return WHOLE.format(Math.floor(n));
}

// benda dengan 1 ≤ n ≤ 50
export function itemsInRange(volumeKg: number): Item[] {
  return ITEMS.filter((i) => {
    const n = volumeKg / i.kg;
    return n >= MIN_COUNT && n <= MAX_COUNT;
  });
}

export type Setara = { item: Item; count: number };

type PickOptions = {
  mode: "auto" | "lock";
  lockedId?: string; // user_settings.compare_item
  previousId?: string | null; // benda di rekap sebelumnya
  random?: () => number;
};

// null kalau volume 0 (misal sesi berat badan semua)
export function pickSetara(volumeKg: number, opts: PickOptions): Setara | null {
  if (volumeKg <= 0) return null;
  const random = opts.random ?? Math.random;

  if (opts.mode === "lock" && opts.lockedId) {
    const item = findItem(opts.lockedId);
    if (item) return { item, count: volumeKg / item.kg };
  }

  const inRange = itemsInRange(volumeKg);
  let item: Item;
  if (inRange.length === 0) {
    // di luar semua rentang: pakai benda paling ringan / paling berat
    item = volumeKg < ITEMS[0].kg ? ITEMS[0] : ITEMS[ITEMS.length - 1];
  } else {
    const fresh = inRange.filter((i) => i.id !== opts.previousId);
    const pool = fresh.length > 0 ? fresh : inRange;
    item = pool[Math.floor(random() * pool.length)];
  }
  return { item, count: volumeKg / item.kg };
}

// untuk /setara: benda lain dalam rentang selain yang sekarang
export function pickOtherSetara(
  volumeKg: number,
  currentId: string | null,
  random: () => number = Math.random,
): Setara | null {
  const pool = itemsInRange(volumeKg).filter((i) => i.id !== currentId);
  if (pool.length === 0) return null;
  const item = pool[Math.floor(random() * pool.length)];
  return { item, count: volumeKg / item.kg };
}
