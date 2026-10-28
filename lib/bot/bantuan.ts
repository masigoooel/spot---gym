// ❓ bantuan / /bantuan = menu tombol per topik (SPEC §5.8), bukan tembok teks.
// tiap topik 3–4 baris + [‹ kembali]. pesan yang sama diedit di tempat.

import { InlineKeyboard, type Context } from "grammy";
import { copy } from "@/lib/copy";
import { createLoginToken } from "@/lib/login-token";
import { HTML, appUrl, show } from "./common";
import * as store from "./store";

export type Topic = keyof typeof copy.help.topics;
export const isTopic = (t: string): t is Topic => t in copy.help.topics;

function menuKeyboard() {
  const b = copy.help.buttons;
  return new InlineKeyboard()
    .text(b.set, "b:set")
    .text(b.numbers, "b:numbers")
    .row()
    .text(b.del, "b:del")
    .text(b.schedule, "b:schedule")
    .row()
    .text(b.recap, "b:recap")
    .text(b.web, "b:web")
    .row()
    .text(b.practice, "b:practice");
}

const back = () => new InlineKeyboard().text(copy.help.buttons.back, "b:menu");

// dari /bantuan (pesan baru) atau tombol ❓ cara pakai / ‹ kembali (edit di tempat)
export async function showMenu(ctx: Context, opts: { edit?: boolean } = {}) {
  if (opts.edit) await show(ctx, copy.help.title, menuKeyboard());
  else await ctx.reply(copy.help.title, { ...HTML, reply_markup: menuKeyboard() });
}

export async function showTopic(ctx: Context, topic: Topic) {
  await show(ctx, copy.help.topics[topic].join("\n"), back());
}

// 🌐 buka dashboard: link masuk sekali pakai (sama dengan /masuk)
export async function showWeb(ctx: Context, user: store.User) {
  const token = await createLoginToken(user.id);
  try {
    await ctx.editMessageText(copy.help.web(`${appUrl()}/masuk?token=${token}`), {
      ...HTML,
      reply_markup: back(),
      // pratinjau link dimatikan: pengambil pratinjau bisa ikut "memakai" token sekali pakai
      link_preview_options: { is_disabled: true },
    });
  } catch {
    // pesan tidak bisa diedit: biarkan, user bisa pakai /masuk
  }
}
