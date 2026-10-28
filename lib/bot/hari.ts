// status hari (SPEC §5.8): /libur, /geser, /kemarin

import type { Context } from "grammy";
import { copy } from "@/lib/copy";
import { formatDayLong } from "@/lib/format";
import { addDays, localDate, nextTrainingDay, plannedSplit, weekdayOf, weekStart } from "@/lib/workout";
import { HTML } from "./common";
import * as kartu from "./kartu";
import * as store from "./store";

const isScheduled = (user: store.User, day: string) => user.splitSchedule[String(weekdayOf(day))] !== undefined;

export async function markRest(ctx: Context, user: store.User, reason: string | null) {
  const today = localDate(new Date(), user.timezone);
  if (!isScheduled(user, today)) return ctx.reply(copy.restNotScheduled, HTML);
  if (await store.hasSessionOn(user.id, today, user.timezone)) return ctx.reply(copy.restHasSession, HTML);

  // libur lain di minggu ini (hari jadwal saja) menentukan masih dalam jatah atau tidak
  const statuses = await store.getWeekStatuses(user.id, weekStart(today));
  const used = Object.entries(statuses).filter(([d, s]) => s === "libur" && d !== today && isScheduled(user, d)).length;
  await store.setDayStatus(user.id, today, "libur", reason);
  return ctx.reply(used + 1 > user.restAllowance ? copy.restOverAllowance : copy.restDone, HTML);
}

export async function shiftToday(ctx: Context, user: store.User) {
  const today = localDate(new Date(), user.timezone);
  const statuses = await store.getWeekStatuses(user.id, weekStart(today));
  const split = plannedSplit(today, user.splitSchedule, statuses);
  if (!split) return ctx.reply(copy.shiftNotScheduled, HTML);
  if (await store.hasSessionOn(user.id, today, user.timezone)) return ctx.reply(copy.shiftHasSession, HTML);

  await store.setDayStatus(user.id, today, "geser");
  const target = nextTrainingDay(today, user.splitSchedule);
  if (!target) return ctx.reply(copy.shiftNoRoom(split), HTML);

  const when =
    target === addDays(today, 1)
      ? copy.tomorrow
      : formatDayLong(new Date(`${target}T12:00:00Z`), "UTC").split(",")[0];
  return ctx.reply(copy.shiftDone(split, when), HTML);
}

// /kemarin: set berikutnya dicatat ke sesi kemarin (berlaku sampai 🏁 selesai latihan atau 3 jam diam).
// langsung kirim kartu latihan; header kartu diberi tag 📅 kemarin.
export async function startYesterday(ctx: Context, user: store.User) {
  await kartu.close(ctx, user);
  await store.setState(user.id, { backdate: true, focusExerciseId: null, awaiting: null, awaitingData: {} });
  await kartu.start(ctx, user, { notice: { kind: "text", text: copy.card.yesterday } });
}
