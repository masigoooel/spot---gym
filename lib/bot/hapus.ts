// hapus di bot (SPEC §5 "hapus di bot"): sebut persis apa yang dihapus, sebut akibatnya,
// minta konfirmasi, kasih [urungkan]. hapus & urungkan sendiri sudah idempotent
// (yang sudah dihapus tidak bisa dihapus lagi), jadi tombolnya tidak perlu sekali pakai.

import { InlineKeyboard, type Context } from "grammy";
import { copy, sessionLabel } from "@/lib/copy";
import { formatDate, formatSetChip } from "@/lib/format";
import * as hapus from "@/lib/hapus";
import { HTML, appUrl, show } from "./common";
import { backdateActive } from "./record";
import * as store from "./store";

const riwayatUrl = () => `${appUrl()}/dashboard/riwayat`;

const setLabel = (s: hapus.SetInfo, user: store.User) =>
  copy.setLabel(s.order, s.exerciseName, formatSetChip(s, user.unit));

const undoKeyboard = (data: string) => new InlineKeyboard().text(copy.undoButton, data);

// /batal (alias tersembunyi) tanpa kartu aktif: set terakhir di sesi yang jalan langsung dihapus, dengan [↩️ urungkan]
export async function undoLast(ctx: Context, user: store.User) {
  const now = new Date();
  const backdated = backdateActive(await store.getState(user.id), now);
  const session = await store.getActiveSession(user.id, now, { backdated });
  const setId = session ? await hapus.lastSetId(user.id, session.id) : null;
  const set = setId ? await hapus.getSetInfo(user.id, setId) : null;
  if (!set) {
    await ctx.reply(copy.nothingToDelete, HTML);
    return;
  }
  const impact = await hapus.setDeleteImpact(user.id, set);
  await hapus.deleteSet(user.id, set.id);
  const prLine = impact.isPr ? copy.prAfterDelete(set.exerciseName, impact.prAfterKg, user.unit) : "";
  await ctx.reply(copy.lastSetDeleted(setLabel(set, user), prLine), { ...HTML, reply_markup: undoKeyboard(`hu:${set.id}`) });
}

// /hapus: daftar set di sesi hari ini + hapus seluruh sesi
export async function listToday(ctx: Context, user: store.User) {
  const sessions = (await store.todaysSessions(user.id, user.timezone, new Date())).filter((s) => s.sets.length > 0);
  if (sessions.length === 0) {
    await ctx.reply(copy.deleteNothingToday(riwayatUrl()), { ...HTML, link_preview_options: { is_disabled: true } });
    return;
  }
  const kb = new InlineKeyboard();
  for (const session of sessions) {
    for (const s of session.sets) {
      kb.text(copy.setLabel(s.order, s.name, formatSetChip(s, user.unit)), `hc:${s.id}`).row();
    }
    kb.text(copy.deleteSessionButton(session.split), `hx:${session.id}`).row();
  }
  kb.text(copy.deleteButtons.no, "hn");
  await ctx.reply(copy.deleteList + copy.deleteOtherDays(riwayatUrl()), {
    ...HTML,
    reply_markup: kb,
    link_preview_options: { is_disabled: true },
  });
}

// konfirmasi hapus satu set: dari tombol "hapus set ini" (pesan baru) atau dari daftar /hapus (diedit)
export async function confirmSet(ctx: Context, user: store.User, setId: string, opts: { edit?: boolean } = {}) {
  const set = await hapus.getSetInfo(user.id, setId);
  if (!set || set.deleted) {
    await ctx.answerCallbackQuery({ text: copy.alreadyDeleted }).catch(() => {});
    return;
  }
  const impact = await hapus.setDeleteImpact(user.id, set);
  const pr = impact.isPr ? copy.prIfDeleted(set.exerciseName, impact.prAfterKg, user.unit) : "";
  const text = copy.confirmSet(setLabel(set, user), pr);
  const kb = new InlineKeyboard().text(copy.deleteButtons.yes, `hy:${set.id}`).text(copy.deleteButtons.no, "hn");
  if (opts.edit) await show(ctx, text, kb);
  else await ctx.reply(text, { ...HTML, reply_markup: kb });
}

export async function deleteSet(ctx: Context, user: store.User, setId: string) {
  const before = await hapus.getSetInfo(user.id, setId);
  if (!before || before.deleted) {
    await ctx.answerCallbackQuery({ text: copy.alreadyDeleted }).catch(() => {});
    return;
  }
  const impact = await hapus.setDeleteImpact(user.id, before);
  await hapus.deleteSet(user.id, setId);
  const prLine = impact.isPr ? copy.prAfterDelete(before.exerciseName, impact.prAfterKg, user.unit) : "";
  await show(ctx, copy.setDeleted(before.order, prLine), undoKeyboard(`hu:${setId}`));
}

export async function restoreSet(ctx: Context, user: store.User, setId: string) {
  const set = await hapus.restoreSet(user.id, setId);
  await show(ctx, set ? copy.setRestored(set.order) : copy.cannotUndo);
}

// konfirmasi hapus sesi: sebut tanggal, jumlah set, dan volume yang ikut terhapus
export async function confirmSession(ctx: Context, user: store.User, sessionId: string) {
  const session = (await store.todaysSessions(user.id, user.timezone, new Date())).find((s) => s.id === sessionId);
  if (!session) {
    await ctx.answerCallbackQuery({ text: copy.alreadyDeleted }).catch(() => {});
    return;
  }
  const label = sessionLabel(session.split, session.startedAt, user.timezone);
  await show(
    ctx,
    copy.confirmSession(label, session.sets.length, session.volume, user.unit),
    new InlineKeyboard().text(copy.deleteButtons.yes, `hxy:${session.id}`).text(copy.deleteButtons.no, "hn"),
  );
}

export async function deleteSession(ctx: Context, user: store.User, sessionId: string) {
  const session = (await store.todaysSessions(user.id, user.timezone, new Date())).find((s) => s.id === sessionId);
  if (!session || !(await hapus.deleteSession(user.id, sessionId))) {
    await ctx.answerCallbackQuery({ text: copy.alreadyDeleted }).catch(() => {});
    return;
  }
  // set yang difokuskan ikut terhapus, jadi set tanpa nama berikutnya jangan nyasar ke sini
  await store.setState(user.id, { focusExerciseId: null, awaiting: null, awaitingData: {} });
  const label = sessionLabel(session.split, session.startedAt, user.timezone);
  await show(ctx, copy.sessionDeleted(label), undoKeyboard(`hxu:${sessionId}`));
}

export async function restoreSession(ctx: Context, user: store.User, sessionId: string) {
  const ok = await hapus.restoreSession(user.id, sessionId);
  const session = ok ? await store.getSessionInfo(user.id, sessionId) : null;
  await show(ctx, session ? copy.sessionRestored(sessionLabel(session.split, session.startedAt, user.timezone)) : copy.cannotUndo);
}

// akun dijadwalkan dihapus: semua pesan ke bot dijawab dengan tanggal hapus + [batalkan penghapusan]
export async function accountBanner(ctx: Context, user: store.User) {
  const date = hapus.accountDeletionDate(user.deleteRequestedAt!);
  const text = copy.accountScheduled(formatDate(date, user.timezone));
  const kb = new InlineKeyboard().text(copy.accountCancelButton, "ac:keep");
  if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});
  await ctx.reply(text, { ...HTML, reply_markup: kb });
}

export async function cancelAccountDeletion(ctx: Context, user: store.User) {
  await hapus.cancelAccountDeletion(user.id);
  await show(ctx, copy.accountKept);
}
