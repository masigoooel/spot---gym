// kenalan saat /start (SPEC §5.3): pesan perkenalan + cara pakai (sekaligus memasang menu bawah),
// lalu satu pertanyaan "mau pakai jadwal ini?". alur 3 pertanyaan (program → berapa kali → hari apa)
// hanya kalau pilih ✏️ atur sendiri, di pesan yang sama. setelah jadwal kesimpan, pesan yang sama
// mengajak latihan coba. pilihan disimpan di data tombol, jadi tidak perlu ingatan di server.

import { InlineKeyboard, type Context } from "grammy";
import { copy, DAY_LABEL, PROGRAM_LABEL, scheduleLine } from "@/lib/copy";
import type { Program } from "@/lib/queries";
import { buildSchedule, type SplitSchedule } from "@/lib/workout";
import { HTML, MENU_VERSION, menuKeyboard, show } from "./common";
import * as store from "./store";

const PROGRAMS = Object.keys(PROGRAM_LABEL) as Program[];

export function isProgram(v: string): v is Program {
  return (PROGRAMS as string[]).includes(v);
}

// `📅 push pull legs — sen pull · sel legs · kam push`
export function describeSchedule(program: Program, schedule: SplitSchedule) {
  const days = Object.entries(schedule)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, split]) => [DAY_LABEL[Number(day) - 1], split] as [string, string]);
  return scheduleLine(PROGRAM_LABEL[program], days);
}

// user baru: perkenalan + cara pakai (menu bawah dipasang di sini), lalu tawarkan jadwal bawaan
export async function welcome(ctx: Context, user: store.User) {
  await ctx.reply(copy.welcome(ctx.from?.first_name ?? null), { ...HTML, reply_markup: menuKeyboard() });
  await store.setState(user.id, { menuVersion: MENU_VERSION });
  const b = copy.welcomeButtons;
  await ctx.reply(copy.welcomeSchedule(describeSchedule(user.program, user.splitSchedule)), {
    ...HTML,
    reply_markup: new InlineKeyboard().text(b.yes, "k:yes").text(b.own, "k:re"),
  });
}

// user lama kirim /start lagi
export async function askRedo(ctx: Context) {
  const b = copy.startAgainButtons;
  await ctx.reply(copy.startAgain, {
    ...HTML,
    reply_markup: new InlineKeyboard().text(b.yes, "k:re").text(b.no, "k:no"),
  });
}

// "✅ oke, pakai ini": jadwal yang ditawarkan disimpan apa adanya
export async function acceptDefault(ctx: Context, user: store.User) {
  const days = Object.keys(user.splitSchedule).length;
  await store.saveOnboarding(user.id, {
    program: user.program,
    weeklyTarget: Math.max(1, days),
    schedule: user.splitSchedule,
  });
  await afterSchedule(ctx, describeSchedule(user.program, user.splitSchedule));
}

export async function askProgram(ctx: Context, opts: { edit?: boolean } = {}) {
  const kb = new InlineKeyboard();
  PROGRAMS.forEach((p, i) => {
    kb.text(PROGRAM_LABEL[p], `k:p:${p}`);
    if (i % 2 === 1) kb.row();
  });
  if (opts.edit) await show(ctx, copy.askProgram, kb);
  else await ctx.reply(copy.askProgram, { ...HTML, reply_markup: kb });
}

export async function askFrequency(ctx: Context, program: Program) {
  const kb = new InlineKeyboard();
  for (const n of [3, 4, 5, 6]) kb.text(String(n), `k:f:${program}:${n}`);
  kb.row().text(copy.stepBack, "k:re");
  await show(ctx, copy.askFrequency(PROGRAM_LABEL[program]), kb);
}

// hari dipilih lewat bitmask di data tombol (bit 0 = senin)
export async function askDays(ctx: Context, program: Program, n: number, mask: number) {
  const kb = new InlineKeyboard();
  DAY_LABEL.forEach((label, i) => {
    const on = (mask & (1 << i)) !== 0;
    kb.text(`${on ? "✓ " : ""}${label}`, `k:d:${program}:${n}:${mask}:${i + 1}`);
    if (i === 3) kb.row();
  });
  kb.row().text(copy.stepBack, `k:p:${program}`).text(copy.daysDone, `k:ok:${program}:${n}:${mask}`);
  const days = daysFromMask(mask);
  const preview = days.length ? describeSchedule(program, buildSchedule(program, days)) : null;
  await show(ctx, copy.askDays(n, days.length, preview), kb);
}

export function daysFromMask(mask: number): number[] {
  return [1, 2, 3, 4, 5, 6, 7].filter((d) => mask & (1 << (d - 1)));
}

export async function finishOnboarding(ctx: Context, user: store.User, program: Program, n: number, mask: number) {
  const schedule = buildSchedule(program, daysFromMask(mask));
  await store.saveOnboarding(user.id, { program, weeklyTarget: n, schedule });
  await afterSchedule(ctx, describeSchedule(program, schedule));
}

// pesan jadwal jadi catatan jadwal + ajakan [▶️ coba sekarang (30 detik)] [👍 ngerti]
// (cara pakai sudah ada di pesan perkenalan)
async function afterSchedule(ctx: Context, schedule: string) {
  const b = copy.tourButtons;
  await show(ctx, copy.scheduleSaved(schedule), new InlineKeyboard().text(b.practice, "co:go").text(b.ok, "co:ok"));
}

// "gak usah" di /start user lama: pertanyaannya dihapus, menu bawah dipasang ulang
export async function keepSchedule(ctx: Context, user: store.User) {
  await ctx.deleteMessage().catch(() => {});
  await ctx.reply(copy.startKeep, { ...HTML, reply_markup: menuKeyboard() });
  await store.setState(user.id, { menuVersion: MENU_VERSION });
}

// pasang menu bawah lewat pesan baru (menu lama → menu baru)
export async function sendMenu(ctx: Context, user: store.User, text: string) {
  await ctx.reply(text, { ...HTML, reply_markup: menuKeyboard() });
  await store.setState(user.id, { menuVersion: MENU_VERSION });
}
