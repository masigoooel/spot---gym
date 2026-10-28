// 🏁 selesai latihan / /selesai (SPEC §5.7): kartu aktif dipadatkan (0 set → dihapus) → satu pesan rekap:
// foto kartu story dengan caption rekap + tombol rasa di pesan yang sama. tanpa set → tetap dibalas.

import { InlineKeyboard, InputFile, type Context } from "grammy";
import type { MessageEntity } from "grammy/types";
import { copy } from "@/lib/copy";
import { formatDayLong, timedExtras } from "@/lib/format";
import { getStreakInput } from "@/lib/queries";
import { pickSetara } from "@/lib/setara";
import { getStoryData, storyPng } from "@/lib/story";
import { localDate, nextScheduledDay, streakDays, type Feel } from "@/lib/workout";
import { HTML, appUrl, isLocalUrl } from "./common";
import * as kartu from "./kartu";
import { backdateActive } from "./record";
import * as store from "./store";

export async function finishSession(ctx: Context, user: store.User) {
  const now = new Date();
  await kartu.close(ctx, user);
  const state = await store.getState(user.id);
  const backdate = backdateActive(state, now);
  const session = await store.getActiveSession(user.id, now, { keepIdle: true, backdated: backdate });
  if (backdate || state.focusExerciseId || state.practice) {
    await store.setState(user.id, { backdate: false, focusExerciseId: null, awaiting: null, awaitingData: {}, practice: null });
  }
  if (!session || session.setCount === 0) {
    if (session) await store.deleteSession(user.id, session.id);
    await ctx.reply(copy.emptySession, HTML);
    return;
  }

  // sesi yang sudah lama diam (atau sesi /kemarin) ditutup di waktu set terakhirnya
  const endedAt = session.backdated || store.isIdle(session, now) ? session.lastActivityAt : now;
  await store.closeSession(user.id, session.id, endedAt);
  await store.setState(user.id, { sessionsDone: state.sessionsDone + 1 });
  const totals = await store.getSessionTotals(user.id, session.id);
  const extras = timedExtras(await store.sessionTimedSets(user.id, session.id));
  const minutes = Math.max(1, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60_000));

  const setara = pickSetara(totals.totalVolume, {
    mode: user.compareMode,
    lockedId: user.compareItem,
    previousId: await store.previousCompareItem(user.id, session.id),
  });
  await store.setCompareItem(user.id, session.id, setara?.item.id ?? null);

  const streak = streakDays(await getStreakInput(user.id, user, localDate(now, user.timezone)));
  const askFeel = user.chattiness === "aktif";
  const [previousVolume, prCount] = await Promise.all([
    store.previousSplitVolume(user.id, session.split, session.id),
    store.sessionPrCount(user.id, session.id),
  ]);
  const progress = copy.recapProgress({
    diffKg: previousVolume && totals.totalVolume > 0 ? Math.round(totals.totalVolume - previousVolume) : null,
    split: session.split,
    prCount,
    unit: user.unit,
  });
  let caption = copy.recap({
    split: session.split,
    volume: totals.totalVolume,
    setara,
    setCount: totals.setCount,
    minutes,
    streak,
    unit: user.unit,
    extras,
    progress,
    askFeel,
  });

  // tombol: rasa (kalau cerewet = aktif) + link dashboard & bagikan (telegram menolak link localhost,
  // jadi saat lokal link-nya ditulis di caption)
  const kb = new InlineKeyboard();
  if (askFeel) {
    const b = copy.feelButtons;
    kb.text(b.ringan, `fl:${session.id}:ringan`).text(b.pas, `fl:${session.id}:pas`).text(b.berat, `fl:${session.id}:berat`);
  }
  const dashboardUrl = `${appUrl()}/dashboard/riwayat/${session.id}`;
  const shareUrl = `${appUrl()}/bagikan/${session.id}`;
  if (isLocalUrl(appUrl())) caption += copy.recapLinks(dashboardUrl, shareUrl);
  else kb.row().url(copy.recapButtons.dashboard, dashboardUrl).url(copy.recapButtons.share, shareUrl);
  const markup = askFeel || !isLocalUrl(appUrl()) ? kb : undefined;

  // kartu story otomatis (bisa dimatikan di profil). kalau gagal dibuat, rekap tetap terkirim sebagai teks.
  if (user.autoStory) {
    try {
      const data = await getStoryData(user.id, session.id);
      if (data) {
        await ctx.replyWithPhoto(new InputFile(await storyPng(data), "spot-story.png"), {
          caption,
          ...HTML,
          reply_markup: markup,
        });
        return;
      }
    } catch (err) {
      console.error("kartu story gagal dibuat:", err);
    }
  }
  await ctx.reply(caption, { ...HTML, reply_markup: markup, link_preview_options: { is_disabled: true } });
}

// tombol rasa di pesan rekap: simpan, tambah satu baris di rekap, tombol rasa hilang (link tetap)
export async function saveFeel(ctx: Context, user: store.User, sessionId: string, feel: Feel) {
  await store.setFeel(user.id, sessionId, feel);
  const info = await store.getSessionInfo(user.id, sessionId);
  // penutup: jadwal latihan berikutnya ("besok" / "kamis")
  const next = nextScheduledDay(localDate(new Date(), user.timezone), user.splitSchedule);
  const when = next
    ? next.inDays === 1
      ? copy.tomorrow
      : `${formatDayLong(new Date(`${next.day}T12:00:00Z`), "UTC").split(",")[0]}${next.inDays === 7 ? " depan" : ""}`
    : null;
  const line = `\n\n${copy.feelSaved(info?.split ?? null, next && when ? { when, split: next.split } : null)}`;
  const msg = ctx.callbackQuery?.message;
  if (!msg) return;
  const links = (msg.reply_markup?.inline_keyboard ?? []).flat().filter((b) => "url" in b);
  const reply_markup = links.length ? new InlineKeyboard([links]) : undefined;
  if ("caption" in msg && msg.caption !== undefined) {
    await ctx
      .editMessageCaption({
        caption: msg.caption + line,
        caption_entities: msg.caption_entities as MessageEntity[] | undefined,
        reply_markup,
      })
      .catch(() => {});
  } else if ("text" in msg && msg.text !== undefined) {
    await ctx
      .editMessageText(msg.text + line, {
        entities: msg.entities as MessageEntity[] | undefined,
        reply_markup,
        link_preview_options: { is_disabled: true },
      })
      .catch(() => {});
  }
}
