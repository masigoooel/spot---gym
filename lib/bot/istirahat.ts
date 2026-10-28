// pengingat istirahat (SPEC §5.5): 90 detik setelah set dicatat lewat kartu dan user belum ngapa-ngapain,
// bot kirim satu pesan pendek (supaya hp bunyi). pesan itu dihapus begitu user menekan / mengetik apa pun.
// disimpan di tabel rest_reminders (bukan timer di memori), jadi jalan di polling lokal maupun webhook:
// yang mengirim adalah sendDue(), dipanggil tiap 10 detik oleh bot/dev.ts dan tiap 30 detik oleh /api/cron.

import type { Api } from "grammy";
import { copy } from "@/lib/copy";
import { db, maybe, must, run } from "@/lib/db";
import { HTML } from "./common";
import * as store from "./store";

export const timing = { restMs: 90_000 }; // bisa dipercepat di uji coba

const SENDING = 0; // message_id selama pesan sedang dikirim (supaya tidak terkirim dua kali)

// batalkan pengingat yang belum terkirim, hapus pesannya kalau sudah terkirim
export async function clear(api: Api, chatId: number) {
  const row = maybe(
    await db().from("rest_reminders").delete().eq("chat_id", chatId).select("message_id").maybeSingle<{ message_id: number | null }>(),
  );
  if (row?.message_id) await api.deleteMessage(chatId, row.message_id).catch(() => {});
}

// pasang pengingat untuk set berikutnya; menggantikan pengingat lama di chat ini
export async function schedule(
  chatId: number,
  userId: string,
  expect: { cardMessageId: number; setOrder: number; exerciseName: string },
) {
  run(
    await db()
      .from("rest_reminders")
      .upsert({
        chat_id: chatId,
        user_id: userId,
        due_at: new Date(Date.now() + timing.restMs).toISOString(),
        card_message_id: expect.cardMessageId,
        set_order: expect.setOrder,
        exercise_name: expect.exerciseName,
        message_id: null,
      }),
  );
}

type Row = { chat_id: number; user_id: string; due_at: string; card_message_id: number; set_order: number; exercise_name: string };

// kirim pengingat yang waktunya sudah lewat. hanya kalau kartunya masih sama dan belum ada set baru.
export async function sendDue(api: Api, now = new Date()) {
  const due = must(
    await db()
      .from("rest_reminders")
      .select("chat_id, user_id, due_at, card_message_id, set_order, exercise_name")
      .is("message_id", null)
      .lte("due_at", now.toISOString())
      .returns<Row[]>(),
  );
  for (const r of due) {
    try {
      await sendOne(api, r);
    } catch (err) {
      console.error("pengingat istirahat gagal:", err);
      await db().from("rest_reminders").delete().eq("chat_id", r.chat_id).eq("due_at", r.due_at);
    }
  }
}

async function sendOne(api: Api, r: Row) {
  // ambil giliran dulu: kalau dua cron jalan bersamaan, cuma satu yang mengirim
  const claimed = maybe(
    await db()
      .from("rest_reminders")
      .update({ message_id: SENDING })
      .eq("chat_id", r.chat_id)
      .eq("due_at", r.due_at)
      .is("message_id", null)
      .select("chat_id")
      .maybeSingle(),
  );
  if (!claimed) return;

  const state = await store.getState(r.user_id);
  if (state.cardMessageId !== r.card_message_id || state.draft?.set_order !== r.set_order) {
    await db().from("rest_reminders").delete().eq("chat_id", r.chat_id).eq("due_at", r.due_at);
    return;
  }
  const msg = await api.sendMessage(r.chat_id, copy.restReminder(r.set_order, r.exercise_name), HTML);
  const saved = maybe(
    await db()
      .from("rest_reminders")
      .update({ message_id: msg.message_id })
      .eq("chat_id", r.chat_id)
      .eq("due_at", r.due_at)
      .select("chat_id")
      .maybeSingle(),
  );
  // user keburu menekan sesuatu saat pesan dikirim (barisnya sudah dihapus / diganti): langsung hapus lagi
  if (!saved) await api.deleteMessage(r.chat_id, msg.message_id).catch(() => {});
}
