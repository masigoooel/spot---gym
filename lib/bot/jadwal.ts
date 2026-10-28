// pesan terjadwal: pengingat hari latihan, "kemarin kelewat", rekap mingguan.
// dijalankan tiap menit: oleh bot/dev.ts selama lokal, oleh cron setelah hosting.
// tiap jenis pesan ditandai di bot_daily, jadi paling banyak sekali sehari per user.

import { InlineKeyboard, type Api } from "grammy";
import { copy } from "@/lib/copy";
import { purgeDeleted } from "@/lib/hapus";
import { addDays, localDate, plannedSplit, weekdayOf, weekStart } from "@/lib/workout";
import { HTML } from "./common";
import * as store from "./store";

const MORNING = "07:00";
const WEEKLY_RECAP = "20:00";

const clock = (now: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);

// `users` bisa dibatasi (dipakai uji coba supaya tidak menyentuh user sungguhan)
export async function runScheduledTasks(api: Api, now = new Date(), users?: store.User[]) {
  // sekali sejam cukup untuk bersih-bersih penanda tombol lama
  if (!users && now.getUTCMinutes() === 0) await store.cleanupButtons().catch((err) => console.error(err));
  // sekali sehari (03.00 wib): hapus permanen data yang dihapus > 30 hari & akun yang lewat jeda 7 hari
  if (!users && now.getUTCHours() === 20 && now.getUTCMinutes() === 0) {
    await purgeDeleted(now).catch((err) => console.error("hapus permanen gagal:", err));
  }

  for (const user of users ?? (await store.allUsers())) {
    if (user.deleteRequestedAt) continue; // akun menunggu dihapus: tidak dikirimi apa-apa
    try {
      await tasksFor(api, user, now);
    } catch (err) {
      console.error(`pesan terjadwal untuk ${user.id} gagal:`, err);
    }
  }
}

async function tasksFor(api: Api, user: store.User, now: Date) {
  const today = localDate(now, user.timezone);
  const time = clock(now, user.timezone);
  const chatty = user.chattiness === "aktif" && user.notifySchedule;

  // 1. pagi: jadwal kemarin tanpa sesi & tanpa status → kelewat (streak kembali 0)
  if (time >= MORNING && (await store.markDaily(user.id, today, "kelewat"))) {
    const yesterday = addDays(today, -1);
    const statuses = await store.getWeekStatuses(user.id, weekStart(yesterday));
    const scheduled = user.splitSchedule[String(weekdayOf(yesterday))] !== undefined;
    const dates = await store.sessionDates(user.id, user.timezone);
    const hasStarted = dates.some((d) => d < yesterday); // user baru belum dihitung kelewat
    if (scheduled && hasStarted && !statuses[yesterday] && !dates.includes(yesterday)) {
      await store.setDayStatus(user.id, yesterday, "kelewat");
      const split = user.splitSchedule[String(weekdayOf(yesterday))] ?? null;
      if (chatty) await api.sendMessage(user.telegramId, copy.missedYesterday(split), HTML);
    }
  }

  // 2. jam pengingat: hari ini ada jadwal, belum ada sesi, belum ada status
  if (chatty && time >= user.reminderTime && (await store.markDaily(user.id, today, "pengingat"))) {
    const statuses = await store.getWeekStatuses(user.id, weekStart(today));
    const split = plannedSplit(today, user.splitSchedule, statuses);
    if (split && !statuses[today] && !(await store.hasSessionOn(user.id, today, user.timezone))) {
      const b = copy.reminderButtons;
      const greeting = copy.greeting(Number(time.slice(0, 2)));
      await api.sendMessage(user.telegramId, copy.reminder(greeting, split), {
        ...HTML,
        reply_markup: new InlineKeyboard()
          .text(b.start, "rm:mulai")
          .text(b.later, "rm:nanti")
          .row()
          .text(b.rest, "rm:libur")
          .text(b.shift, "rm:geser"),
      });
    }
  }

  // 3. minggu malam: rekap mingguan
  if (
    user.notifyWeekly &&
    weekdayOf(today) === 7 &&
    time >= WEEKLY_RECAP &&
    (await store.markDaily(user.id, today, "rekap_mingguan"))
  ) {
    const week = await store.weekSummary(user.id, user.timezone, now);
    if (week.sessions > 0) {
      await api.sendMessage(
        user.telegramId,
        copy.week({ ...week, target: user.weeklyTarget, unit: user.unit }),
        HTML,
      );
    }
  }
}
