// latihan tidak dikenal / user lupa namanya (SPEC §4):
// 1. salah ketik → "maksudnya bench press?" (1 kandidat) atau tombol 2–4 kandidat
// 2. cari lewat otot → daftar 6 per halaman (bisa disaring alat)  3. "gak ada" → kasih nama sendiri
// teks yang diketik lalu dipastikan lewat tombol disimpan sebagai alias pribadi (user_aliases).
//
// konteks di data tombol: "o" = ada pesan set asli (pesan bot ini membalasnya),
// "k" = memilih latihan untuk kartu (dari "ganti latihan" / pilih latihan).
// otot & alat di data tombol ditulis sebagai nomor urut MUSCLES / EQUIPMENT.

import { InlineKeyboard, type Context } from "grammy";
import { copy, EQUIPMENT, MUSCLES, OTHER_MUSCLES } from "@/lib/copy";
import { findExercise, normalizeName, parseSetMessage, suggestExercises, type ExerciseRef } from "@/lib/parser";
import { HTML, show } from "./common";
import * as kartu from "./kartu";
import { ensureSession, typedToKg } from "./record";
import * as store from "./store";

export type SearchContext = "o" | "k";

const PAGE_SIZE = 6;

function muscleKeyboard(c: SearchContext) {
  const kb = new InlineKeyboard();
  MUSCLES.forEach((m, i) => {
    kb.text(m, `cm:${c}:${i}`);
    if (i % 2 === 1) kb.row();
  });
  return kb;
}

// otot di tabel exercises yang masuk ke satu tombol otot
const musclesOf = (button: string): string[] => (button === "lainnya" ? OTHER_MUSCLES : [button]);

// nama latihan di pesan set tidak dikenal
export async function handleUnknown(ctx: Context, name: string, catalog: ExerciseRef[]) {
  const replyTo = ctx.msg ? { reply_parameters: { message_id: ctx.msg.message_id } } : {};
  const guesses = suggestExercises(name, catalog);
  if (guesses.length === 1) {
    const b = copy.yesNo;
    await ctx.reply(copy.didYouMean(guesses[0].name), {
      ...HTML,
      ...replyTo,
      reply_markup: new InlineKeyboard().text(b.yes, `cp:o:${guesses[0].id}`).text(b.no, "tn"),
    });
    return;
  }
  if (guesses.length > 1) {
    const kb = new InlineKeyboard();
    guesses.forEach((g, i) => {
      kb.text(g.name, `cp:o:${g.id}`);
      if (i % 2 === 1) kb.row();
    });
    kb.row().text(copy.noneOfThese, "tn");
    await ctx.reply(copy.didYouMeanMany, { ...HTML, ...replyTo, reply_markup: kb });
    return;
  }
  await ctx.reply(copy.askMuscle, { ...HTML, ...replyTo, reply_markup: muscleKeyboard("o") });
}

export async function askMuscle(ctx: Context, c: SearchContext, opts: { edit?: boolean } = {}) {
  const text = c === "o" ? copy.askMuscle : copy.pickMuscle;
  if (opts.edit) await show(ctx, text, muscleKeyboard(c));
  else await ctx.reply(text, { ...HTML, reply_markup: muscleKeyboard(c) });
}

// daftar latihan satu otot: 6 per halaman, 2 kolom, saringan alat, halaman diedit di tempat
export async function listExercises(
  ctx: Context,
  user: store.User,
  c: SearchContext,
  muscleIndex: number,
  equipmentIndex: number,
  page: number,
) {
  const muscle = MUSCLES[muscleIndex];
  const equipment = EQUIPMENT[equipmentIndex];
  if (!muscle || !equipment) return;
  const muscles = musclesOf(muscle);
  const matches = (await store.getCatalog(user.id)).filter(
    (e) =>
      muscles.includes(e.muscle ?? "") &&
      (equipment === "semua" || e.equipment === equipment) &&
      e.slug !== "lain",
  );
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(Math.max(page, 0), pages - 1);
  const at = (ei: number, p: number) => `cl:${c}:${muscleIndex}:${ei}:${p}`;

  const kb = new InlineKeyboard();
  const shown = matches.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  shown.forEach((e, i) => {
    kb.text(e.name, `cp:${c}:${e.id}`);
    if (i % 2 === 1) kb.row();
  });
  if (shown.length % 2 === 1) kb.row();
  const l = copy.listButtons;
  if (current > 0) kb.text(l.prev, at(equipmentIndex, current - 1));
  if (current < pages - 1) kb.text(l.next, at(equipmentIndex, current + 1));
  if (current > 0 || current < pages - 1) kb.row();
  EQUIPMENT.forEach((name, i) => {
    kb.text(i === equipmentIndex ? `• ${name}` : name, at(i, 0));
    if (i % 3 === 2) kb.row();
  });
  kb.text(l.muscles, `cb:${c}`).text(copy.noneButton, `cn:${c}:${muscleIndex}:${equipmentIndex}`);

  await show(
    ctx,
    matches.length ? copy.exerciseList(muscle, equipment, current, pages) : copy.noMatch(muscle, equipment),
    kb,
  );
}

// latihan dipilih (lewat saran salah ketik, daftar, atau pilihan di kartu)
export async function choose(ctx: Context, user: store.User, c: SearchContext, exerciseId: number) {
  const catalog = await store.getCatalog(user.id);
  const exercise = catalog.find((e) => e.id === exerciseId);
  if (!exercise) return;
  if (c === "k") {
    await kartu.switchTo(ctx, user, exercise);
    return;
  }
  await recordOriginal(ctx, user, exercise, catalog, originalText(ctx));
}

// "gak ada" → tanya nama; pesan set asli (kalau ada) disimpan supaya nanti tetap tercatat
export async function askName(ctx: Context, user: store.User, c: SearchContext, muscleIndex: number, equipmentIndex: number) {
  const button = MUSCLES[muscleIndex];
  const filter = EQUIPMENT[equipmentIndex];
  if (!button || !filter) return;
  await store.setState(user.id, {
    awaiting: "nama",
    awaitingData: {
      muscle: button === "lainnya" ? "lain" : button,
      equipment: filter === "semua" ? "alat lain" : filter,
      original: c === "o" ? originalText(ctx) : null,
      // pesan pertanyaan ini nanti berubah jadi kartu
      prompt: ctx.callbackQuery?.message?.message_id ?? null,
    },
  });
  await show(ctx, copy.askName);
}

// ketikan nama dari user (bot_state.awaiting = "nama")
export async function receiveName(ctx: Context, user: store.User, text: string, state: store.BotState) {
  const name = normalizeName(text);
  if (name.length < 2 || name.length > 40 || name.startsWith("/")) {
    await ctx.reply(copy.nameInvalid, HTML);
    return;
  }
  const { muscle, equipment, original, prompt } = state.awaitingData as {
    muscle: string;
    equipment: string;
    original: string | null;
    prompt: number | null;
  };

  const catalog = await store.getCatalog(user.id);
  const existing = findExercise(name, catalog);
  const exercise =
    existing ??
    (await store.createExercise(user.id, name, {
      isBodyweight: equipment === "berat badan",
      muscle,
      equipment,
      kind: muscle === "kardio" ? "kardio" : muscle === "mobilitas" ? "durasi" : "beban",
    }));
  await store.setState(user.id, { awaiting: null, awaitingData: {} });
  // nama yang diketik dihapus; pesan pertanyaan berubah jadi kartu latihan itu
  if (ctx.msg) await ctx.api.deleteMessage(ctx.msg.chat.id, ctx.msg.message_id).catch(() => {});
  const target = prompt ?? undefined;
  if (original) {
    await recordOriginal(ctx, user, exercise, [...catalog, exercise], original, target);
    return;
  }
  const notice = existing ? null : ({ kind: "text", text: copy.card.saved(exercise.name) } as const);
  await kartu.present(ctx, user, await ensureSession(user, new Date()), exercise, target ? "edit" : "new", {
    notice,
    target,
  });
}

function originalText(ctx: Context): string | null {
  const msg = ctx.callbackQuery?.message;
  return msg && "reply_to_message" in msg ? (msg.reply_to_message?.text ?? null) : null;
}

// baca ulang pesan set asli dengan latihan yang sudah dipastikan, simpan nama ketikannya
// sebagai alias pribadi, lalu catat. pesan pertanyaan bot berubah jadi kartu.
async function recordOriginal(
  ctx: Context,
  user: store.User,
  exercise: ExerciseRef,
  catalog: ExerciseRef[],
  original: string | null,
  target?: number,
) {
  if (!original) {
    await show(ctx, copy.originalMissing);
    return;
  }
  const result = parseSetMessage(original, catalog, { exercise });
  if (!result.ok) {
    await show(ctx, copy.notUnderstoodIdle(original));
    return;
  }
  if (result.name && !findExercise(result.name, catalog)) await store.saveUserAlias(user.id, result.name, exercise.id);
  const mode = ctx.callbackQuery || target ? "edit" : "new";
  await kartu.logAndShow(ctx, user, exercise, typedToKg(result.sets, user), original, mode, target);
}
