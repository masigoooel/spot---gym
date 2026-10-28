// potongan kecil yang dipakai semua handler bot

import { Keyboard, type Context, type InlineKeyboard } from "grammy";
import { copy } from "@/lib/copy";
import * as store from "./store";

export const HTML = { parse_mode: "HTML" } as const;

export function sender(ctx: Context): store.TelegramUser {
  if (!ctx.from) throw new Error("update tanpa pengirim");
  return ctx.from;
}

export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

// telegram menolak tombol link ke localhost, jadi selama lokal link ditulis di teks
export const isLocalUrl = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/.test(url);

// tombol sekali pakai: false kalau tombol di pesan ini sudah pernah ditekan (dan user diberi tahu)
export async function claim(ctx: Context): Promise<boolean> {
  const msg = ctx.callbackQuery?.message;
  if (!msg) return true;
  const fresh = await store.claimButton(msg.chat.id, msg.message_id);
  if (!fresh) await ctx.answerCallbackQuery({ text: copy.buttonUsed }).catch(() => {});
  return fresh;
}

// lepas lagi tanda "sudah dipakai" kalau proses tombolnya gagal, supaya bisa dicoba ulang
export async function release(ctx: Context) {
  const msg = ctx.callbackQuery?.message;
  if (msg) await store.releaseButton(msg.chat.id, msg.message_id).catch(() => {});
}

// menu bawah (reply keyboard, persistent), 2 tombol: 🏋️ kartu latihan · ❓ bantuan (SPEC §5.2).
// MENU_VERSION naik kalau isinya berubah, supaya user lama dikirimi menu baru sekali.
export const MENU_VERSION = 3;
export function menuKeyboard() {
  const m = copy.menu;
  return new Keyboard().text(m.card).text(m.help).resized().persistent();
}

// matikan tombol di pesan yang barusan ditekan
export async function retire(ctx: Context) {
  await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
}

// ganti isi pesan tombol; kalau tidak bisa diedit, kirim pesan baru
export async function show(ctx: Context, text: string, keyboard?: InlineKeyboard) {
  try {
    await ctx.editMessageText(text, { ...HTML, reply_markup: keyboard });
  } catch (err) {
    if (String(err).includes("message is not modified")) return;
    await ctx.reply(text, { ...HTML, reply_markup: keyboard });
  }
}
