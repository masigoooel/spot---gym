// kartu latihan (SPEC §5.5–5.7): satu kartu per latihan, diedit di tempat.
// mencatat set tidak mengirim pesan baru. angka di kartu (draft) disimpan di bot_state,
// jadi data tombol pendek dan tanpa angka (§5.10).

import { InlineKeyboard, type Context } from "grammy";
import {
  DEFAULT_TARGET,
  adjustDraft,
  compactCard,
  computeDraft,
  parseQuick,
  renderCard,
  weightStepKg,
  type Button,
  type CardSet,
  type DraftSource,
  type Field,
  type Notice,
} from "@/lib/card";
import { copy } from "@/lib/copy";
import { fromUnit } from "@/lib/format";
import * as hapus from "@/lib/hapus";
import { findExercise, parseSetMessage, type ExerciseRef, type ParsedSet } from "@/lib/parser";
import { localDate } from "@/lib/workout";
import { HTML, show } from "./common";
import * as istirahat from "./istirahat";
import * as latihan from "./latihan";
import { backdateActive, ensureSession, logSets, plannedSplitFor, typedToKg } from "./record";
import * as store from "./store";

const TIPS_SESSIONS = 3; // baris 💡 hanya di 3 sesi pertama
const DOUBLE_TAP_MS = 1500; // cadangan: ✅ catat dua kali dalam 1,5 detik = satu set

export const toKeyboard = (rows: Button[][]) =>
  InlineKeyboard.from(rows.map((r) => r.map((b) => InlineKeyboard.text(b.text, b.data))));

const toParsed = (s: CardSet, failed = false): ParsedSet => ({
  weightKg: s.weightKg,
  isAdded: s.isAdded,
  reps: s.reps,
  durationSec: s.durationSec,
  distanceM: s.distanceM,
  failed,
  isDrop: false,
});

const fromInfo = (s: hapus.SetInfo): CardSet => ({
  weightKg: s.weightKg,
  isAdded: s.isAdded,
  reps: s.reps,
  durationSec: s.durationSec,
  distanceM: s.distanceM,
});

type Mode =
  | "edit" // pesan tombol yang barusan ditekan (atau `target`) berubah jadi kartu
  | "bottom" // kartu yang sama dikirim ulang di paling bawah (kartu lama dihapus)
  | "new"; // kartu lama ditinggal (dipadatkan / dihapus kalau 0 set), kartu baru di paling bawah

type Show = {
  set?: CardSet | null; // angka yang sudah diubah pakai ±
  notice?: Notice | null;
  deletedSetId?: string; // set yang barusan dihapus: tampilkan [↩️ urungkan]
  target?: number; // pesan yang diedit jadi kartu (bawaan: pesan tombol yang ditekan)
};

// ---------- isi kartu ----------

async function build(user: store.User, state: store.BotState, session: store.Session, exercise: ExerciseRef, opts: Show) {
  const catalog = await store.getCatalog(user.id);
  const [today, previous, plan] = await Promise.all([
    store.exerciseSetsInSession(user.id, session.id, exercise.id),
    store.previousExerciseSession(user.id, exercise.id, session.id),
    latihan.dayPlan(user, session, catalog, exercise.id, state.skippedExerciseIds),
  ]);
  const sameDay =
    !!previous && localDate(previous.startedAt, user.timezone) === localDate(session.startedAt, user.timezone);
  const auto = computeDraft(previous?.sets ?? [], today, previous?.feel ?? null, weightStepKg(exercise.equipment));
  const manual = opts.set !== undefined;
  const set = manual ? (opts.set ?? null) : auto.draft;
  const source: DraftSource = manual ? { kind: "manual" } : auto.source;

  // "latihan 2 dari 7 hari ini": posisi = urutan dikerjakan (latihan dipilih sendiri, bukan urutan template);
  // jumlah = urutan hari ini + latihan lain yang sudah dikerjakan
  const day = [...new Set([...plan.done, exercise.id, ...plan.order])];
  const remaining = plan.order.filter(
    (id) => id !== exercise.id && !plan.done.includes(id) && !state.skippedExerciseIds.includes(id),
  ).length;
  const target = previous?.sets.length || DEFAULT_TARGET;
  const view = renderCard({
    name: exercise.name,
    kind: exercise.kind ?? "beban",
    isBodyweight: exercise.isBodyweight,
    equipment: exercise.equipment,
    unit: user.unit,
    split: session.split,
    position: day.indexOf(exercise.id) + 1,
    total: day.length,
    yesterday: session.backdated,
    today,
    target,
    hasPrevious: !!previous,
    when: sameDay ? "tadi" : "minggu lalu",
    earlierToday: sameDay ? previous!.sets : null,
    draft: set,
    source,
    hasNext: !!plan.next,
    remaining,
    // kartu pertama sesi: belum ada set sama sekali di sesi ini
    opening: plan.done.length === 0 && today.length === 0 && !sameDay,
    previous: previous?.sets ?? [],
    allDone: plan.allDone,
    tips: state.sessionsDone < TIPS_SESSIONS && user.chattiness === "aktif",
    notice: opts.notice ?? null,
    undoable: !!opts.deletedSetId,
  });
  return { view, set, today, target };
}

// ---------- meninggalkan kartu ----------

async function deleteMessage(ctx: Context, messageId: number | null | undefined) {
  if (messageId && ctx.chat) await ctx.api.deleteMessage(ctx.chat.id, messageId).catch(() => {});
}

// kartu lama: punya set → dipadatkan jadi satu baris tanpa tombol; 0 set → pesannya dihapus
// (dan latihannya ditandai dilewati, kalau `skip`). balikan: perubahan state.
async function leave(ctx: Context, user: store.User, state: store.BotState, opts: { skip: boolean }) {
  const patch: Partial<store.BotState> = { cardMessageId: null, draft: null, lastDeletedSetId: null };
  if (!state.cardMessageId || !state.draft || !ctx.chat) return patch;
  const { exercise_id: exerciseId, session_id: sessionId } = state.draft;
  const sets = await store.exerciseSetsInSession(user.id, sessionId, exerciseId);
  const exercise = (await store.getCatalog(user.id)).find((e) => e.id === exerciseId);
  if (sets.length && exercise) {
    await ctx.api
      .editMessageText(ctx.chat.id, state.cardMessageId, compactCard(exercise.name, sets, user.unit), HTML)
      .catch(() => {});
    patch.compactMessages = { ...state.compactMessages, [exerciseId]: state.cardMessageId };
  } else {
    await deleteMessage(ctx, state.cardMessageId);
    if (opts.skip) patch.skippedExerciseIds = [...new Set([...state.skippedExerciseIds, exerciseId])];
  }
  return patch;
}

// ---------- tampilkan kartu ----------

export async function present(
  ctx: Context,
  user: store.User,
  session: store.Session,
  exercise: ExerciseRef,
  mode: Mode,
  opts: Show = {},
) {
  let state = await store.getState(user.id);
  const target = opts.target ?? ctx.callbackQuery?.message?.message_id ?? null;
  let patch: Partial<store.BotState> = {};

  if (mode === "bottom") await deleteMessage(ctx, state.cardMessageId);
  else if (mode === "new" || (state.cardMessageId && state.cardMessageId !== target)) {
    patch = await leave(ctx, user, state, { skip: true });
  }
  state = { ...state, ...patch };

  // satu baris padat per latihan: kalau latihan ini sudah punya baris padat, baris itu dihapus
  const compact = { ...state.compactMessages };
  if (compact[exercise.id]) {
    if (compact[exercise.id] !== target) await deleteMessage(ctx, compact[exercise.id]);
    delete compact[exercise.id];
  }
  const skipped = state.skippedExerciseIds.filter((id) => id !== exercise.id);
  const { view, set, today, target: setTarget } = await build(user, { ...state, skippedExerciseIds: skipped }, session, exercise, opts);
  const keyboard = toKeyboard(view.rows);

  let messageId: number | null = null;
  if (mode === "edit" && target && ctx.chat) {
    try {
      await ctx.api.editMessageText(ctx.chat.id, target, view.text, { ...HTML, reply_markup: keyboard });
      messageId = target;
    } catch (err) {
      if (String(err).includes("message is not modified")) messageId = target;
    }
  }
  if (messageId === null) messageId = (await ctx.reply(view.text, { ...HTML, reply_markup: keyboard })).message_id;

  await store.setState(user.id, {
    ...patch,
    cardMessageId: messageId,
    draft: store.toDraft(exercise.id, session.id, today.length + 1, set),
    lastDeletedSetId: opts.deletedSetId ?? null,
    compactMessages: compact,
    skippedExerciseIds: skipped,
    focusExerciseId: exercise.id,
  });
  return { messageId, setOrder: today.length + 1, target: setTarget, hasDraft: !!set };
}

// kartu aktif selesai (🏁 / /selesai): punya set → dipadatkan; 0 set → dihapus
export async function close(ctx: Context, user: store.User) {
  const state = await store.getState(user.id);
  const patch = await leave(ctx, user, state, { skip: false });
  await store.setState(user.id, { ...patch, ...store.CARD_RESET });
}

// sesi + latihan dari kartu aktif; null kalau kartunya sudah tidak berlaku
async function active(user: store.User, state: store.BotState) {
  if (!state.draft || !state.cardMessageId) return null;
  const now = new Date();
  const session = await store.getActiveSession(user.id, now, { backdated: backdateActive(state, now) });
  if (!session || session.id !== state.draft.session_id) return null;
  const exercise = (await store.getCatalog(user.id)).find((e) => e.id === state.draft!.exercise_id);
  return exercise ? { session, exercise, set: store.draftSet(state.draft) } : null;
}

// ---------- 🏋️ kartu latihan ----------

// sudah ada sesi dengan set → kartu aktif dikirim ulang di bawah. belum ada (atau sesinya belum ada set
// sama sekali, jadi belum benar-benar mulai) → tanya dulu mau latihan apa (split: undefined),
// atau langsung daftar latihan (null = split jadwal hari ini, teks = split itu).
export async function start(ctx: Context, user: store.User, opts: { split?: string | null; notice?: Notice } = {}) {
  const state = await store.getState(user.id);
  const current = await active(user, state);
  if (current && current.session.setCount === 0) {
    // kartu kosong dari sesi yang belum ada set: dihapus, pilih ulang dari awal
    await deleteMessage(ctx, state.cardMessageId);
    await store.setState(user.id, store.CARD_RESET);
  } else if (current) {
    await present(ctx, user, current.session, current.exercise, "bottom", {
      set: current.set,
      notice: opts.notice,
      deletedSetId: state.lastDeletedSetId ?? undefined,
    });
    return;
  } else if (state.cardMessageId) {
    // kartu dari sesi yang sudah ditutup: dipadatkan / dihapus dulu
    await store.setState(user.id, await leave(ctx, user, state, { skip: false }));
  }

  if (opts.split === undefined) await askSplit(ctx, user, { notice: opts.notice });
  else await begin(ctx, user, opts.split, { notice: opts.notice });
}

// "mau latihan apa hari ini?" — jadwal cuma saran: split jadwal paling atas, split lain tetap bisa dipilih.
// edit: dari [‹ ganti split] di daftar latihan (pesan yang sama).
export async function askSplit(ctx: Context, user: store.User, opts: { notice?: Notice; edit?: boolean } = {}) {
  const scheduled = await plannedSplitFor(user, new Date());
  const planned = scheduled === "bebas" ? null : scheduled;
  const text = copy.askSplit(planned, opts.notice?.kind === "text" ? opts.notice.text : null);
  const keyboard = latihan.splitKeyboard(user, { planned });
  if (opts.edit) await show(ctx, text, keyboard);
  else await ctx.reply(text, { ...HTML, reply_markup: keyboard });
}

// buka sesi dengan split itu, lalu daftar latihan rekomendasi: user pilih sendiri mau mulai dari mana.
// sesi yang sudah terbuka tapi belum ada set ikut ganti split. target: pesan pilihan split yang diedit.
async function begin(ctx: Context, user: store.User, split: string | null, opts: { notice?: Notice; target?: number }) {
  let session = await ensureSession(user, new Date(), { split });
  if (split !== null && session.split !== split && session.setCount === 0) {
    await store.updateSessionSplit(user.id, session.id, split);
    session = { ...session, split };
  }
  const { keyboard, empty } = await latihan.exerciseList(user, session, { text: copy.splitButtons.back, data: "ks" });
  const text = [...(opts.notice?.kind === "text" ? [opts.notice.text] : []), copy.pickExercise(session.split, empty)].join("\n");
  if (opts.target) await show(ctx, text, keyboard);
  else await ctx.reply(text, { ...HTML, reply_markup: keyboard });
}

// tombol split (sp:…): dari pesan "mau latihan apa?" saat mulai, atau 🔄 → 📅 ganti split di tengah sesi.
// ganti split di tengah sesi: set yang sudah kecatat tetap, kartu jadi daftar latihan split baru.
export async function chooseSplit(ctx: Context, user: store.User, split: string) {
  const state = await store.getState(user.id);
  const here = ctx.callbackQuery?.message?.message_id;
  const current = await active(user, state);
  if (!current) {
    await ctx.answerCallbackQuery().catch(() => {});
    await begin(ctx, user, split, { target: here });
    return;
  }
  if (!here || here !== state.cardMessageId) {
    await ctx.answerCallbackQuery({ text: copy.card.expired }).catch(() => {});
    return;
  }
  await ctx.answerCallbackQuery().catch(() => {});
  await store.updateSessionSplit(user.id, current.session.id, split);
  await store.setState(user.id, { skippedExerciseIds: [] });
  const session = { ...current.session, split };
  const { keyboard, empty } = await latihan.exerciseList(user, session, { text: copy.swapButtons.back, data: "c:back" });
  await show(ctx, copy.pickExercise(split, empty), keyboard);
}

// pindah ke latihan lain dari pilihan 🔄 / hasil cari / daftar pilih latihan.
// kartu lama yang punya set dipadatkan dan kartu baru dikirim di bawah; kartu 0 set langsung berubah jadi kartu baru.
export async function switchTo(ctx: Context, user: store.User, exercise: ExerciseRef) {
  const state = await store.getState(user.id);
  const session = await ensureSession(user, new Date());
  const here = ctx.callbackQuery?.message?.message_id ?? null;
  if (here && here === state.cardMessageId && state.draft && state.draft.exercise_id !== exercise.id) {
    const sets = await store.exerciseSetsInSession(user.id, state.draft.session_id, state.draft.exercise_id);
    if (sets.length) {
      await present(ctx, user, session, exercise, "new");
      return;
    }
    await store.setState(user.id, {
      skippedExerciseIds: [...new Set([...state.skippedExerciseIds, state.draft.exercise_id])],
    });
  }
  await present(ctx, user, session, exercise, "edit");
}

// catat set hasil ketikan / pilihan (beban sudah kg), lalu tampilkan kartunya
export async function logAndShow(
  ctx: Context,
  user: store.User,
  exercise: ExerciseRef,
  sets: ParsedSet[],
  rawText: string,
  mode: Mode = "new",
  target?: number,
) {
  const state = await store.getState(user.id);
  const res = await logSets(user, exercise, sets, rawText);
  const sameCard = state.draft?.exercise_id === exercise.id && state.draft.session_id === res.session.id;
  const notice: Notice = res.prText ? { kind: "pr", text: res.prText } : { kind: "logged" };
  const shown = await present(ctx, user, res.session, exercise, sameCard && mode === "new" ? "bottom" : mode, { notice, target });
  // pengingat istirahat: masih ada set berikutnya di latihan ini (bukan kardio, bukan nyatet /kemarin,
  // bot tidak disetel "seperlunya")
  const resting =
    shown.setOrder <= shown.target && shown.hasDraft && exercise.kind !== "kardio" && !res.session.backdated;
  if (resting && user.chattiness === "aktif" && ctx.chat) {
    await istirahat.schedule(ctx.chat.id, user.id, {
      cardMessageId: shown.messageId,
      setOrder: shown.setOrder,
      exerciseName: exercise.name,
    });
  }
}

// ---------- tombol kartu (c:…) ----------

export async function onButton(ctx: Context, user: store.User, action: string) {
  const state = await store.getState(user.id);
  const here = ctx.callbackQuery?.message?.message_id;
  if (!here || here !== state.cardMessageId) {
    await ctx.answerCallbackQuery({ text: copy.card.expired }).catch(() => {});
    return;
  }
  const current = await active(user, state);
  if (!current) {
    // sesi kartu ini sudah ditutup otomatis (3 jam tanpa set baru)
    await ctx.answerCallbackQuery({ text: copy.card.closed, show_alert: true }).catch(() => {});
    await store.setState(user.id, { ...(await leave(ctx, user, state, { skip: false })), ...store.CARD_RESET });
    return;
  }
  const { session, exercise, set } = current;

  if (action === "ok") {
    // tombol idempotent (§5.10): tombol membawa teks kartu saat ditekan ("set 3 dari 3").
    // kalau nomor setnya sudah bukan set_order di draft, set itu sudah tercatat (ditekan dua kali).
    const msg = ctx.callbackQuery?.message;
    const shown = /· set (\d+)/.exec(msg && "text" in msg ? (msg.text ?? "") : "")?.[1];
    const last = await store.lastExerciseSet(user.id, session.id, exercise.id);
    const stale = shown !== undefined && Number(shown) !== state.draft!.set_order;
    if (stale || (last && Date.now() - last.createdAt.getTime() < DOUBLE_TAP_MS)) {
      await ctx.answerCallbackQuery({ text: copy.card.alreadyLogged }).catch(() => {});
      return;
    }
  }
  await ctx.answerCallbackQuery().catch(() => {});

  const adjust = /^([wrtk])([+-])$/.exec(action);
  if (adjust && set) {
    const next = adjustDraft(set, adjust[1] as Field, adjust[2] === "+" ? 1 : -1, {
      kind: exercise.kind ?? "beban",
      equipment: exercise.equipment,
      unit: user.unit,
      isBodyweight: exercise.isBodyweight,
    });
    await present(ctx, user, session, exercise, "edit", { set: next });
    return;
  }
  switch (action) {
    case "ok":
      if (set) await logAndShow(ctx, user, exercise, [toParsed(set)], "(kartu)", "edit");
      return;
    case "del":
      await deleteLast(ctx, user, "edit");
      return;
    case "undo": {
      const restored = state.lastDeletedSetId ? await hapus.restoreSet(user.id, state.lastDeletedSetId) : null;
      await present(ctx, user, session, exercise, "edit", {
        notice: restored
          ? { kind: "restored", order: restored.order, set: fromInfo(restored) }
          : { kind: "text", text: copy.cannotUndo },
      });
      return;
    }
    case "next": {
      // latihan berikutnya dipilih sendiri: kartu jadi daftar latihan (+ [‹ kembali ke kartu])
      const back = { text: copy.swapButtons.back, data: "c:back" };
      const { keyboard, empty } = await latihan.exerciseList(user, session, back, exercise.id);
      await show(ctx, copy.pickNext(empty), keyboard);
      return;
    }
    case "swap":
      await latihan.showSwap(ctx, user, session, exercise);
      return;
    case "split": {
      const back = { text: copy.swapButtons.back, data: "c:back" };
      await show(ctx, copy.changeSplit(session.split), latihan.splitKeyboard(user, { planned: null, exclude: session.split, extra: [back] }));
      return;
    }
    case "back":
      await present(ctx, user, session, exercise, "edit", { set });
      return;
  }
}

// ↩️ hapus set terakhir (kartu / ketik `-` / /batal): set terakhir latihan di kartu langsung dihapus,
// tanpa konfirmasi, kartu kasih [↩️ urungkan]. false kalau tidak ada kartu aktif.
export async function deleteLast(ctx: Context, user: store.User, mode: "edit" | "bottom"): Promise<boolean> {
  const state = await store.getState(user.id);
  const current = await active(user, state);
  if (!current) return false;
  const last = await store.lastExerciseSet(user.id, current.session.id, current.exercise.id);
  const removed = last ? await hapus.deleteSet(user.id, last.id) : null;
  if (!removed) {
    await present(ctx, user, current.session, current.exercise, mode, {
      set: current.set,
      notice: { kind: "text", text: copy.card.nothingToDelete },
    });
    return true;
  }
  await present(ctx, user, current.session, current.exercise, mode, {
    notice: { kind: "deleted", order: removed.order, set: fromInfo(removed), other: null },
    deletedSetId: removed.id,
  });
  return true;
}

// ---------- ngetik saat ada kartu aktif (§5.6) ----------

export type TextResult = "handled" | "unknown" | "skip";

// dibaca terhadap kartu: `6`, `6 gagal`, `70 8`, `70x8`, `ok`, `x3`, `-`, `60s`, `bench 70x8`, atau nama latihan.
// kalau terbaca: pesan user dihapus, kartu lama dihapus, kartu terbaru dikirim di paling bawah.
export async function onText(ctx: Context, user: store.User, state: store.BotState, text: string): Promise<TextResult> {
  const current = await active(user, state);
  if (!current) return "skip";
  const { exercise, set } = current;
  const catalog = await store.getCatalog(user.id);
  const quick = parseQuick(text, exercise.kind ?? "beban");
  const removeTyped = () => (ctx.msg ? ctx.api.deleteMessage(ctx.msg.chat.id, ctx.msg.message_id).catch(() => {}) : null);

  if (quick?.type === "delete") {
    await deleteLast(ctx, user, "bottom");
    await removeTyped();
    return "handled";
  }

  let target = exercise;
  let sets: ParsedSet[] | null = null;
  if (quick?.type === "ok" && set) sets = Array.from({ length: quick.count }, () => toParsed(set));
  else if (quick?.type === "reps") {
    const base = set ?? { weightKg: null, isAdded: false, reps: null, durationSec: null, distanceM: null };
    if (base.weightKg !== null || exercise.isBodyweight) sets = [toParsed({ ...base, reps: quick.reps }, quick.failed)];
  } else if (quick?.type === "set") {
    const weightKg = fromUnit(quick.weight, user.unit);
    sets = [
      toParsed({ weightKg, isAdded: exercise.isBodyweight, reps: quick.reps, durationSec: null, distanceM: null }, quick.failed),
    ];
  } else if (!quick) {
    const parsed = parseSetMessage(text, catalog, { lastExercise: exercise });
    if (parsed.ok && parsed.exercise) {
      target = parsed.exercise;
      sets = typedToKg(parsed.sets, user);
    } else if (parsed.ok) {
      return "unknown";
    } else if (parsed.reason === "no_sets") {
      // cuma nama latihan: pindah kartu ke latihan itu
      const named = findExercise(text, catalog);
      if (named) {
        await removeTyped();
        if (named.id !== exercise.id) await present(ctx, user, current.session, named, "new");
        else await present(ctx, user, current.session, exercise, "bottom", { set });
        return "handled";
      }
    }
  }

  if (!sets) {
    // tidak dimengerti: pesan user tidak dihapus
    await ctx.reply(copy.notUnderstood(text), {
      ...HTML,
      reply_markup: new InlineKeyboard().text(copy.helpButton, "b:menu"),
    });
    return "handled";
  }
  await logAndShow(ctx, user, target, sets, text, target.id === exercise.id ? "bottom" : "new");
  await removeTyped();
  return "handled";
}
