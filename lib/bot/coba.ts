// latihan coba (SPEC §5.4): kartu sungguhan dengan data contoh (bench press, 60 kg × 8),
// 3 langkah, tidak disimpan ke sets dan tidak dihitung ke "3 sesi pertama". bisa diulang dari ❓ bantuan.

import { InlineKeyboard, type Context } from "grammy";
import { DEFAULT_TARGET, adjustDraft, parseQuick, renderCard, type CardSet } from "@/lib/card";
import { copy } from "@/lib/copy";
import { fromUnit } from "@/lib/format";
import { HTML } from "./common";
import { toKeyboard } from "./kartu";
import * as store from "./store";

const EXAMPLE: CardSet = { weightKg: 60, isAdded: false, reps: 8, durationSec: null, distanceM: null };
const INSTRUCTION = { 1: copy.practice.step1, 2: copy.practice.step2, 3: copy.practice.done } as const;

function view(user: store.User, p: store.Practice, typed: boolean) {
  const v = renderCard({
    name: copy.practice.name,
    kind: "beban",
    isBodyweight: false,
    equipment: "barbel",
    unit: user.unit,
    split: null,
    position: 0,
    total: 0,
    yesterday: false,
    today: p.logged,
    target: DEFAULT_TARGET,
    hasPrevious: false,
    when: "minggu lalu",
    earlierToday: null,
    draft: p.step === 3 ? null : p.draft,
    source: { kind: "manual" },
    hasNext: false,
    remaining: 0,
    opening: false,
    previous: [],
    allDone: false,
    tips: false,
    notice: typed ? { kind: "text", text: copy.practice.typed } : null,
    undoable: false,
    prefix: "p",
    practice: INSTRUCTION[p.step],
  });
  // langkah terakhir: cuma [👍 ngerti]
  const keyboard = p.step === 3 ? new InlineKeyboard().text(copy.practice.doneButton, "p:done") : toKeyboard(v.rows);
  return { text: v.text, keyboard };
}

async function save(user: store.User, practice: store.Practice | null) {
  await store.setState(user.id, { practice });
}

export async function start(ctx: Context, user: store.User) {
  const p: store.Practice = { step: 1, messageId: null, draft: EXAMPLE, logged: [] };
  const v = view(user, p, false);
  const sent = await ctx.reply(v.text, { ...HTML, reply_markup: v.keyboard });
  await save(user, { ...p, messageId: sent.message_id });
}

// tampilkan langkah sekarang: di pesan yang sama (tombol), atau pindah ke bawah (ketikan)
async function render(ctx: Context, user: store.User, p: store.Practice, opts: { typed?: boolean; bottom?: boolean } = {}) {
  const v = view(user, p, !!opts.typed);
  if (!opts.bottom && ctx.callbackQuery) {
    await ctx.editMessageText(v.text, { ...HTML, reply_markup: v.keyboard }).catch(() => {});
    await save(user, p);
    return;
  }
  if (p.messageId && ctx.chat) await ctx.api.deleteMessage(ctx.chat.id, p.messageId).catch(() => {});
  const sent = await ctx.reply(v.text, { ...HTML, reply_markup: v.keyboard });
  await save(user, { ...p, messageId: sent.message_id });
}

const logged = (p: store.Practice, set: CardSet): store.Practice => ({
  ...p,
  logged: [...p.logged, set],
  draft: set,
  step: p.step === 1 ? 2 : 3,
});

// tombol p:… di kartu contoh
export async function onButton(ctx: Context, user: store.User, action: string) {
  const state = await store.getState(user.id);
  const p = state.practice;
  if (!p || p.messageId !== ctx.callbackQuery?.message?.message_id) {
    await ctx.answerCallbackQuery({ text: copy.card.expired }).catch(() => {});
    return;
  }
  await ctx.answerCallbackQuery().catch(() => {});
  if (action === "done") {
    // 👍 ngerti → kartu contoh dihapus
    await ctx.deleteMessage().catch(() => {});
    await save(user, null);
    return;
  }
  const adjust = /^([wr])([+-])$/.exec(action);
  if (adjust) {
    const draft = adjustDraft(p.draft, adjust[1] as "w" | "r", adjust[2] === "+" ? 1 : -1, {
      kind: "beban",
      equipment: "barbel",
      unit: user.unit,
      isBodyweight: false,
    });
    await render(ctx, user, { ...p, draft });
    return;
  }
  if (action === "ok") await render(ctx, user, logged(p, p.draft));
}

// ketikan selama latihan coba (`6`, `60x9`, `ok`) juga diterima dan dipuji
export async function onText(ctx: Context, user: store.User, p: store.Practice, text: string): Promise<boolean> {
  if (p.step === 3) return false;
  const quick = parseQuick(text, "beban");
  const pair = /^(\d{1,4}(?:[.,]\d{1,2})?)\s*[x×*]\s*(\d{1,3})$/i.exec(text.trim());
  let set: CardSet | null = null;
  if (quick?.type === "ok") set = p.draft;
  else if (quick?.type === "reps") set = { ...p.draft, reps: quick.reps };
  else if (quick?.type === "set") set = { ...p.draft, weightKg: fromUnit(quick.weight, user.unit), reps: quick.reps };
  else if (pair) set = { ...p.draft, weightKg: fromUnit(Number(pair[1].replace(",", ".")), user.unit), reps: Number(pair[2]) };
  if (!set) return false;
  if (ctx.msg) await ctx.api.deleteMessage(ctx.msg.chat.id, ctx.msg.message_id).catch(() => {});
  await render(ctx, user, logged(p, set), { typed: true, bottom: true });
  return true;
}
