// handler perintah bot (grammY). ditulis sekali di sini, dipanggil dari
// bot/dev.ts (long polling) sekarang dan dari /api/telegram (webhook) nanti.

import { Bot, InlineKeyboard, type Context } from "grammy";
import { copy } from "@/lib/copy";
import { createLoginToken } from "@/lib/login-token";
import { findExercise, parseSetMessage } from "@/lib/parser";
import { pickOtherSetara } from "@/lib/setara";
import type { Feel } from "@/lib/workout";
import * as bantuan from "./bantuan";
import * as cari from "./cari";
import * as coba from "./coba";
import { HTML, MENU_VERSION, appUrl, claim, release, retire, sender, show } from "./common";
import * as hapus from "./hapus";
import * as hari from "./hari";
import * as istirahat from "./istirahat";
import * as kartu from "./kartu";
import * as kenalan from "./kenalan";
import { ensureSession, typedToKg } from "./record";
import * as rekap from "./rekap";
import * as store from "./store";

function parseSplitArg(arg: string): string | null {
  const split = arg.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 30);
  return split || null;
}

const userOf = async (ctx: Context) => (await store.ensureUser(sender(ctx))).user;

// tombol menu bawah (§5.2), plus label menu versi sebelumnya
type MenuAction = "card" | "help" | "finish" | "del";
function menuAction(text: string): { action: MenuAction; legacy: boolean } | null {
  const t = text.trim();
  if (t === copy.menu.card) return { action: "card", legacy: false };
  if (t === copy.menu.help) return { action: "help", legacy: false };
  for (const [action, labels] of Object.entries(copy.legacyMenu)) {
    if (labels.includes(t)) return { action: action as MenuAction, legacy: true };
  }
  return null;
}

// pesan menu/ketikan user dihapus supaya chat tetap rapi (bot boleh menghapus pesan di chat pribadi)
const removeTyped = (ctx: Context) =>
  ctx.msg ? ctx.api.deleteMessage(ctx.msg.chat.id, ctx.msg.message_id).catch(() => {}) : null;

// hapus set terakhir (/batal, menu lama): lewat kartu kalau ada, kalau tidak pesan biasa
async function deleteLast(ctx: Context, user: store.User) {
  if (await kartu.deleteLast(ctx, user, "bottom")) await removeTyped(ctx);
  else await hapus.undoLast(ctx, user);
}

export function createBot(token: string): Bot {
  const bot = new Bot(token);
  const pm = bot.chatType("private");

  // tombol: `once` = hanya boleh dipakai sekali (mencatat sesuatu), sisanya cuma navigasi
  const button = (
    pattern: RegExp,
    handler: (ctx: Context & { match: RegExpMatchArray }, user: store.User) => Promise<unknown>,
    { once = false, answer = true } = {},
  ) =>
    pm.callbackQuery(pattern, async (ctx) => {
      if (once && !(await claim(ctx))) return;
      if (answer) await ctx.answerCallbackQuery().catch(() => {});
      try {
        await handler(ctx as Context & { match: RegExpMatchArray }, await userOf(ctx));
      } catch (err) {
        if (once) await release(ctx);
        throw err;
      }
    });

  // user menekan / mengetik apa pun: pengingat istirahat yang tertunda dibatalkan, yang sudah terkirim dihapus
  pm.use(async (ctx, next) => {
    await istirahat.clear(ctx.api, ctx.chat.id);
    await next();
  });

  // akun yang dijadwalkan dihapus: semua pesan dijawab dengan tanggal hapus + [batalkan penghapusan]
  pm.use(async (ctx, next) => {
    if (ctx.callbackQuery?.data === "ac:keep" || !ctx.from) return next();
    const user = await store.findUser(ctx.from.id);
    if (user?.deleteRequestedAt) await hapus.accountBanner(ctx, user);
    else await next();
  });
  button(/^ac:keep$/, async (ctx, user) => hapus.cancelAccountDeletion(ctx, user));

  // ---------- perintah ----------

  pm.command("start", async (ctx) => {
    const { user, created } = await store.ensureUser(sender(ctx));
    if (created) await kenalan.welcome(ctx, user);
    else await kenalan.askRedo(ctx);
  });

  pm.command("bantuan", (ctx) => bantuan.showMenu(ctx));

  pm.command("masuk", async (ctx) => {
    const user = await userOf(ctx);
    const token = await createLoginToken(user.id);
    // pratinjau link dimatikan: pengambil pratinjau bisa ikut "memakai" token sekali pakai
    await ctx.reply(copy.loginLink(`${appUrl()}/masuk?token=${token}`), {
      ...HTML,
      link_preview_options: { is_disabled: true },
    });
  });

  pm.command("latihan", async (ctx) => kartu.start(ctx, await userOf(ctx)));
  // alias tersembunyi (§5.2): /mulai = /latihan, /batal = hapus set terakhir
  pm.command("mulai", async (ctx) => kartu.start(ctx, await userOf(ctx), { split: parseSplitArg(ctx.match) ?? undefined }));
  pm.command("selesai", async (ctx) => rekap.finishSession(ctx, await userOf(ctx)));
  pm.command("libur", async (ctx) => hari.markRest(ctx, await userOf(ctx), ctx.match.trim().slice(0, 100) || null));
  pm.command("geser", async (ctx) => hari.shiftToday(ctx, await userOf(ctx)));
  pm.command("kemarin", async (ctx) => hari.startYesterday(ctx, await userOf(ctx)));

  pm.command("batal", async (ctx) => deleteLast(ctx, await userOf(ctx)));
  pm.command("hapus", async (ctx) => hapus.listToday(ctx, await userOf(ctx)));

  pm.command("rekap", async (ctx) => {
    const user = await userOf(ctx);
    const week = await store.weekSummary(user.id, user.timezone, new Date());
    await ctx.reply(copy.week({ ...week, target: user.weeklyTarget, unit: user.unit }), HTML);
  });

  pm.command("pr", async (ctx) => {
    const user = await userOf(ctx);
    const arg = ctx.match.trim();
    if (!arg) {
      const best = await store.bestSets(user.id);
      const text = best.length
        ? [copy.prTitle, ...best.slice(0, 10).map((b) => copy.prLine(b, user.timezone, user.unit)), copy.prFooter].join("\n")
        : copy.prNone;
      await ctx.reply(text, HTML);
      return;
    }
    const exercise = findExercise(arg, await store.getCatalog(user.id));
    if (!exercise) {
      await ctx.reply(copy.prUnknown(arg), HTML);
      return;
    }
    if (exercise.kind === "durasi") {
      const sec = await store.previousBestSec(user.id, exercise.id);
      await ctx.reply(sec ? `${copy.prDurationLine(exercise.name, sec)}\n${copy.prFooter}` : copy.prNoneFor(exercise.name), HTML);
      return;
    }
    const [best] = await store.bestSets(user.id, exercise.id);
    await ctx.reply(
      best ? `🏆 ${copy.prLine(best, user.timezone, user.unit)}\n${copy.prFooter}` : copy.prNoneFor(exercise.name),
      HTML,
    );
  });

  pm.command("setara", async (ctx) => {
    const user = await userOf(ctx);
    const last = await store.lastClosedSession(user.id);
    if (!last || last.totalVolume <= 0) {
      await ctx.reply(copy.setaraNothing, HTML);
      return;
    }
    const next = pickOtherSetara(last.totalVolume, last.compareItem);
    if (!next) {
      await ctx.reply(copy.setaraNoOther, HTML);
      return;
    }
    await store.setCompareItem(user.id, last.id, next.item.id);
    await ctx.reply(copy.setaraChanged(next), HTML);
  });

  // ---------- kenalan & latihan coba ----------

  button(/^k:yes$/, async (ctx, user) => kenalan.acceptDefault(ctx, user));
  button(/^k:p:(\w+)$/, async (ctx) => {
    if (kenalan.isProgram(ctx.match[1])) await kenalan.askFrequency(ctx, ctx.match[1]);
  });
  button(/^k:f:(\w+):(\d)$/, async (ctx) => {
    if (kenalan.isProgram(ctx.match[1])) await kenalan.askDays(ctx, ctx.match[1], Number(ctx.match[2]), 0);
  });
  button(/^k:d:(\w+):(\d):(\d+):([1-7])$/, async (ctx) => {
    const [, program, n, mask, day] = ctx.match;
    if (kenalan.isProgram(program)) {
      await kenalan.askDays(ctx, program, Number(n), Number(mask) ^ (1 << (Number(day) - 1)));
    }
  });
  // simpan jadwal: aman ditekan berkali-kali (hasilnya sama), jadi tidak perlu tanda sekali pakai
  pm.callbackQuery(/^k:ok:(\w+):(\d):(\d+)$/, async (ctx) => {
    const [, program, n, mask] = ctx.match;
    if (Number(mask) === 0) {
      await ctx.answerCallbackQuery({ text: copy.needDay });
      return;
    }
    if (!kenalan.isProgram(program)) return;
    await ctx.answerCallbackQuery();
    await kenalan.finishOnboarding(ctx, await userOf(ctx), program, Number(n), Number(mask));
  });
  button(/^k:re$/, async (ctx) => kenalan.askProgram(ctx, { edit: true }));
  button(/^k:no$/, async (ctx, user) => kenalan.keepSchedule(ctx, user));
  // tombol di pesan tur: tombolnya dilepas, teks tur tetap ada
  button(/^co:go$/, async (ctx, user) => {
    await retire(ctx);
    await coba.start(ctx, user);
  });
  button(/^co:ok$/, async (ctx) => retire(ctx));
  button(/^p:(\w[+-]?|ok|done)$/, async (ctx, user) => coba.onButton(ctx, user, ctx.match[1]), { answer: false });

  // ---------- kartu latihan ----------

  // pilih split saat mulai / ganti split di tengah sesi (notifikasi tombol dijawab di dalam)
  button(/^sp:(.{1,30})$/, async (ctx, user) => kartu.chooseSplit(ctx, user, ctx.match[1]), { answer: false });
  button(/^ks$/, async (ctx, user) => kartu.askSplit(ctx, user, { edit: true })); // [‹ ganti split] di daftar latihan
  button(/^c:([wrtk][+-]|ok|del|undo|next|fin|swap|back|split)$/, async (ctx, user) => {
    if (ctx.match[1] === "fin") {
      await ctx.answerCallbackQuery().catch(() => {});
      await rekap.finishSession(ctx, user);
    } else await kartu.onButton(ctx, user, ctx.match[1]);
  }, { answer: false });
  button(/^cx:(\d+)$/, async (ctx, user) => {
    const exercise = (await store.getCatalog(user.id)).find((e) => e.id === Number(ctx.match[1]));
    if (exercise) await kartu.switchTo(ctx, user, exercise);
  });

  // ---------- cari latihan ----------

  button(/^tn$/, async (ctx) => cari.askMuscle(ctx, "o", { edit: true }));
  button(/^cb:([ok])$/, async (ctx) => cari.askMuscle(ctx, ctx.match[1] as cari.SearchContext, { edit: true }));
  button(/^cm:([ok]):(\d+)$/, async (ctx, user) =>
    cari.listExercises(ctx, user, ctx.match[1] as cari.SearchContext, Number(ctx.match[2]), 0, 0),
  );
  button(/^cl:([ok]):(\d+):(\d+):(\d+)$/, async (ctx, user) => {
    const [, c, m, e, page] = ctx.match;
    await cari.listExercises(ctx, user, c as cari.SearchContext, Number(m), Number(e), Number(page));
  });
  button(/^cp:o:(\d+)$/, async (ctx, user) => cari.choose(ctx, user, "o", Number(ctx.match[1])), { once: true });
  button(/^cp:k:(\d+)$/, async (ctx, user) => cari.choose(ctx, user, "k", Number(ctx.match[1])));
  button(/^cn:([ok]):(\d+):(\d+)$/, async (ctx, user) =>
    cari.askName(ctx, user, ctx.match[1] as cari.SearchContext, Number(ctx.match[2]), Number(ctx.match[3])),
  );

  // ---------- hapus & urungkan ----------

  const UUID = "([0-9a-f-]{36})";
  button(new RegExp(`^hs:${UUID}$`), async (ctx, user) => hapus.confirmSet(ctx, user, ctx.match[1]));
  button(new RegExp(`^hc:${UUID}$`), async (ctx, user) => hapus.confirmSet(ctx, user, ctx.match[1], { edit: true }));
  button(new RegExp(`^hy:${UUID}$`), async (ctx, user) => hapus.deleteSet(ctx, user, ctx.match[1]));
  button(new RegExp(`^hu:${UUID}$`), async (ctx, user) => hapus.restoreSet(ctx, user, ctx.match[1]));
  button(new RegExp(`^hx:${UUID}$`), async (ctx, user) => hapus.confirmSession(ctx, user, ctx.match[1]));
  button(new RegExp(`^hxy:${UUID}$`), async (ctx, user) => hapus.deleteSession(ctx, user, ctx.match[1]));
  button(new RegExp(`^hxu:${UUID}$`), async (ctx, user) => hapus.restoreSession(ctx, user, ctx.match[1]));
  button(/^hn$/, async (ctx) => show(ctx, copy.deleteCancelled));
  button(/^ha$/, async (ctx, user) => hapus.listToday(ctx, user));

  // ---------- bantuan ----------

  button(/^b:menu$/, async (ctx) => bantuan.showMenu(ctx, { edit: true }));
  button(/^b:web$/, async (ctx, user) => bantuan.showWeb(ctx, user));
  button(/^b:practice$/, async (ctx, user) => {
    await retire(ctx);
    await coba.start(ctx, user);
  });
  button(/^b:(\w+)$/, async (ctx) => {
    if (bantuan.isTopic(ctx.match[1])) await bantuan.showTopic(ctx, ctx.match[1]);
  });

  // ---------- rasa & pengingat ----------

  button(
    /^fl:([0-9a-f-]{36}):(ringan|pas|berat)$/,
    async (ctx, user) => rekap.saveFeel(ctx, user, ctx.match[1], ctx.match[2] as Feel),
    { once: true },
  );
  button(
    /^rm:(mulai|nanti|libur|geser)$/,
    async (ctx, user) => {
      await retire(ctx);
      const choice = ctx.match[1];
      // pengingat sudah menyebut split jadwal hari ini, jadi langsung daftar latihan split itu
      if (choice === "mulai") await kartu.start(ctx, user, { split: null });
      else if (choice === "nanti") await ctx.reply(copy.reminderLater, HTML);
      else if (choice === "libur") await hari.markRest(ctx, user, null);
      else await hari.shiftToday(ctx, user);
    },
    { once: true },
  );

  // tombol dari versi lama yang formatnya sudah tidak dikenal
  pm.on("callback_query:data", (ctx) => ctx.answerCallbackQuery({ text: copy.buttonOld }));

  // ---------- pesan teks ----------

  pm.on("message:text", async (ctx) => {
    const text = ctx.msg.text;
    if (text.startsWith("/")) {
      await ctx.reply(copy.unknownCommand, HTML);
      return;
    }

    const user = await userOf(ctx);
    let state = await store.getState(user.id);

    // menu bawah versi lama masih terpasang: kirim menu baru sekali
    const menu = menuAction(text);
    if (state.menuVersion < MENU_VERSION && !state.practice) {
      await kenalan.sendMenu(ctx, user, copy.menuUpdated);
      state = { ...state, menuVersion: MENU_VERSION };
    }

    if (menu) {
      if (state.awaiting) await store.setState(user.id, { awaiting: null, awaitingData: {} });
      if (menu.action === "card") {
        await kartu.start(ctx, user);
        await removeTyped(ctx);
      } else if (menu.action === "help") await bantuan.showMenu(ctx);
      else if (menu.action === "finish") await rekap.finishSession(ctx, user);
      else await deleteLast(ctx, user);
      return;
    }

    // latihan coba: ketikan juga diterima
    if (state.practice && (await coba.onText(ctx, user, state.practice, text))) return;

    // bot sedang menunggu nama latihan pribadi
    if (state.awaiting === "nama") {
      await cari.receiveName(ctx, user, text, state);
      return;
    }

    // ada kartu aktif: ketik cepat dibaca terhadap kartu itu
    const catalog = await store.getCatalog(user.id);
    const onCard = await kartu.onText(ctx, user, state, text);
    if (onCard === "handled") return;

    // tanpa kartu aktif (§5.6): `bench 70x8` → buka sesi + kartu dengan set itu tercatat
    const now = new Date();
    const result = parseSetMessage(text, catalog);
    if (result.ok && result.exercise) {
      await kartu.logAndShow(ctx, user, result.exercise, typedToKg(result.sets, user), text);
      await removeTyped(ctx);
      return;
    }
    if (result.ok || onCard === "unknown") {
      await cari.handleUnknown(ctx, result.ok ? result.name : text, catalog);
      return;
    }
    if (result.reason === "no_name") {
      // angka saja tanpa kartu
      await ctx.reply(copy.numbersWithoutCard, HTML);
      return;
    }
    if (result.reason === "no_sets") {
      // cuma nama latihan: buka kartunya
      const named = findExercise(text, catalog);
      if (named) {
        const session = await ensureSession(user, now, {});
        await kartu.present(ctx, user, session, named, "new");
        await removeTyped(ctx);
        return;
      }
    }
    await ctx.reply(copy.notUnderstoodIdle(text), {
      ...HTML,
      reply_markup: new InlineKeyboard().text(copy.helpButton, "b:menu"),
    });
  });

  bot.catch(async (err) => {
    console.error(err.error);
    try {
      await err.ctx.reply(copy.error, HTML);
    } catch {
      // balasan error pun gagal; cukup dicatat di log
    }
  });

  return bot;
}
