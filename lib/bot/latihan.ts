// urutan latihan hari ini, pesan "🔄 ganti latihan", dan pilihan split (SPEC §5.5).
//   urutan = urutan sesi sebelumnya split ini → kalau belum ada, urutan template.
//   latihan yang sudah ada set hari ini atau dilewati tidak ditawarkan lagi otomatis.

import { InlineKeyboard, type Context } from "grammy";
import { copy } from "@/lib/copy";
import type { ExerciseRef } from "@/lib/parser";
import { PROGRAM_SPLITS } from "@/lib/workout";
import { show } from "./common";
import * as store from "./store";

const MAX_REMAINING = 4;
const MAX_ALTERNATIVES = 2;
const MAX_LIST = 10; // daftar latihan setelah pilih split (= panjang template)
const DEFAULT_PLAN = 5; // template bawaan: yang dihitung "latihan hari ini" cuma 5 teratas

// urutan latihan sesi ini (split bebas tanpa riwayat: latihan yang paling sering dipakai).
// `counted`: yang dihitung "latihan hari ini" ("hari ini ada n latihan", "masih ada n yang belum");
// dari template bawaan cuma 5 teratas, daftar pilihan tetap 10
export async function plannedOrder(user: store.User, session: store.Session, { counted = false } = {}): Promise<number[]> {
  const split = session.split && session.split !== "bebas" ? session.split : null;
  if (split) {
    const last = await store.lastSplitOrder(user.id, split, session.id);
    if (last.length) return last;
    const template = await store.getTemplate(user.id, split);
    if (template.ids.length) return counted && !template.own ? template.ids.slice(0, DEFAULT_PLAN) : template.ids;
  }
  return store.frequentExerciseIds(user.id, split, new Date(), 6);
}

export type DayPlan = {
  order: number[]; // urutan hari ini (yang dikenal katalog)
  done: number[]; // latihan yang sudah ada set di sesi ini
  next: ExerciseRef | null; // latihan berikutnya (belum ada set, tidak dilewati, bukan yang sekarang)
  allDone: boolean; // semua latihan di urutan sudah ada set
};

export async function dayPlan(
  user: store.User,
  session: store.Session,
  catalog: ExerciseRef[],
  currentId: number | null,
  skipped: number[],
): Promise<DayPlan> {
  const [rawOrder, done] = await Promise.all([
    plannedOrder(user, session, { counted: true }),
    store.sessionExerciseIds(user.id, session.id),
  ]);
  const known = (id: number) => catalog.some((e) => e.id === id && e.slug !== "lain");
  const order = rawOrder.filter(known);
  const skip = new Set([...done, ...skipped, ...(currentId ? [currentId] : [])]);
  const nextId = order.find((id) => !skip.has(id));
  return {
    order,
    done,
    next: catalog.find((e) => e.id === nextId) ?? null,
    allDone: order.length > 0 && order.every((id) => done.includes(id)),
  };
}

function choiceRows(kb: InlineKeyboard, list: ExerciseRef[]) {
  list.forEach((e, i) => {
    kb.text(e.name, `cx:${e.id}`);
    if (i % 2 === 1) kb.row();
  });
  if (list.length % 2 === 1) kb.row();
}

// "🔄 ganti latihan": kartu diedit jadi pilihan — sisa urutan hari ini (maks. 4),
// pengganti kalau alat dipakai (maks. 2), lalu [🔍 cari latihan lain] [‹ kembali ke kartu]
export async function showSwap(ctx: Context, user: store.User, session: store.Session, current: ExerciseRef) {
  const catalog = await store.getCatalog(user.id);
  const [order, done] = await Promise.all([plannedOrder(user, session), store.sessionExerciseIds(user.id, session.id)]);
  const byId = (id: number) => catalog.find((e) => e.id === id && e.slug !== "lain");
  const remaining = order
    .filter((id) => id !== current.id && !done.includes(id))
    .map(byId)
    .filter((e): e is ExerciseRef => !!e)
    .slice(0, MAX_REMAINING);
  const alternatives = (current.alternatives ?? [])
    .map((slug) => catalog.find((e) => e.slug === slug))
    .filter((e): e is ExerciseRef => !!e && !remaining.includes(e) && e.id !== current.id)
    .slice(0, MAX_ALTERNATIVES);

  const kb = new InlineKeyboard();
  choiceRows(kb, remaining);
  choiceRows(kb, alternatives);
  kb.text(copy.swapButtons.split, "c:split").row();
  kb.text(copy.swapButtons.search, "cb:k").text(copy.swapButtons.back, "c:back");
  await show(ctx, copy.swapTitle, kb);
}

// ---------- pilih split ----------

const ALL_SPLITS = ["push", "pull", "legs", "upper", "lower", "full"];

// split yang ditawarkan: dari program + jadwal user; kalau isinya kurang dari 2, semua split umum
export function splitOptions(user: store.User): string[] {
  const mine = [...new Set([...PROGRAM_SPLITS[user.program], ...Object.values(user.splitSchedule)])].filter(
    (s) => s !== "bebas",
  );
  return mine.length >= 2 ? mine : ALL_SPLITS;
}

// tombol split (callback `sp:<split>`): yang sesuai jadwal paling atas, lalu 2 kolom, lalu [bebas],
// lalu baris tambahan (mis. [‹ kembali ke kartu])
export function splitKeyboard(
  user: store.User,
  opts: { planned: string | null; exclude?: string | null; extra?: { text: string; data: string }[] },
) {
  const button = (text: string, split: string) => InlineKeyboard.text(text, `sp:${split}`);
  const rows = [];
  if (opts.planned) rows.push([button(copy.splitButtons.planned(opts.planned), opts.planned)]);
  const rest = splitOptions(user).filter((s) => s !== opts.planned && s !== opts.exclude);
  for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2).map((s) => button(s, s)));
  if (opts.planned !== "bebas" && opts.exclude !== "bebas") rows.push([button(copy.splitButtons.free, "bebas")]);
  if (opts.extra) rows.push(opts.extra.map((b) => InlineKeyboard.text(b.text, b.data)));
  return InlineKeyboard.from(rows);
}

// daftar latihan rekomendasi split sesi ini (urutan sesi sebelumnya / template), 2 kolom.
// bukan paksaan: user pilih sendiri mau mulai dari mana. yang sudah ada set di sesi ini diberi ✅.
// baris bawah: [🔍 cari latihan lain] + `back` ([‹ ganti split] saat mulai, [‹ kembali ke kartu] di tengah sesi)
export async function exerciseList(
  user: store.User,
  session: store.Session,
  back: { text: string; data: string },
  exclude: number | null = null, // latihan di kartu sekarang (untuk ➡️ latihan berikutnya)
) {
  const catalog = await store.getCatalog(user.id);
  const [order, done] = await Promise.all([plannedOrder(user, session), store.sessionExerciseIds(user.id, session.id)]);
  const list = order
    .map((id) => catalog.find((e) => e.id === id && e.slug !== "lain"))
    .filter((e): e is ExerciseRef => !!e && e.id !== exclude)
    .slice(0, MAX_LIST);
  const label = (e: ExerciseRef) => (done.includes(e.id) ? copy.doneChoice(e.name) : e.name);
  const rows = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2).map((e) => InlineKeyboard.text(label(e), `cx:${e.id}`)));
  rows.push([InlineKeyboard.text(copy.swapButtons.search, "cb:k"), InlineKeyboard.text(back.text, back.data)]);
  return { keyboard: InlineKeyboard.from(rows), empty: list.length === 0 };
}
