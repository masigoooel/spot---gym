// pengingat istirahat (SPEC §5.5): 90 detik setelah set dicatat lewat kartu dan user belum ngapa-ngapain,
// bot kirim satu pesan pendek (supaya hp bunyi). pesan itu dihapus begitu user menekan / mengetik apa pun.
// timer disimpan di memori proses bot: jalan di mode polling lokal; bot restart = pengingat yang tertunda hilang.

import type { Api } from "grammy";
import { copy } from "@/lib/copy";
import { HTML } from "./common";
import * as store from "./store";

export const timing = { restMs: 90_000 }; // bisa dipercepat di uji coba

type Pending = { timer: NodeJS.Timeout | null; messageId: number | null };
const pending = new Map<number, Pending>(); // per chat

// batalkan pengingat yang belum terkirim, hapus yang sudah terkirim
export async function clear(api: Api, chatId: number) {
  const p = pending.get(chatId);
  if (!p) return;
  pending.delete(chatId);
  if (p.timer) clearTimeout(p.timer);
  if (p.messageId) await api.deleteMessage(chatId, p.messageId).catch(() => {});
}

// dikirim hanya kalau kartunya masih sama dan belum ada set baru (draft masih set yang sama)
export function schedule(
  api: Api,
  chatId: number,
  userId: string,
  expect: { cardMessageId: number; setOrder: number; exerciseName: string },
) {
  void clear(api, chatId);
  const entry: Pending = { timer: null, messageId: null };
  entry.timer = setTimeout(async () => {
    entry.timer = null;
    try {
      const state = await store.getState(userId);
      if (pending.get(chatId) !== entry) return;
      if (state.cardMessageId !== expect.cardMessageId || state.draft?.set_order !== expect.setOrder) {
        pending.delete(chatId);
        return;
      }
      const msg = await api.sendMessage(chatId, copy.restReminder(expect.setOrder, expect.exerciseName), HTML);
      // user keburu menekan sesuatu saat pesan dikirim: langsung dihapus lagi
      if (pending.get(chatId) !== entry) await api.deleteMessage(chatId, msg.message_id).catch(() => {});
      else entry.messageId = msg.message_id;
    } catch (err) {
      pending.delete(chatId);
      console.error("pengingat istirahat gagal:", err);
    }
  }, timing.restMs);
  pending.set(chatId, entry);
}
