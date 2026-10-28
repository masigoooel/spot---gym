// pengaturan bot di sisi telegram: daftar perintah + nama & deskripsi (SPEC §5).
// dipanggil bot/dev.ts saat bot lokal jalan, dan bot/webhook.ts saat memasang webhook vercel.

import type { Api } from "grammy";
import { copy } from "@/lib/copy";

export async function syncProfile(api: Api) {
  await api.setMyCommands(copy.commands);
  // nama & deskripsi diubah hanya kalau beda (setMyName dibatasi telegram)
  try {
    const p = copy.botProfile;
    if ((await api.getMyName()).name !== p.name) await api.setMyName(p.name);
    if ((await api.getMyDescription()).description !== p.description) await api.setMyDescription(p.description);
    if ((await api.getMyShortDescription()).short_description !== p.short) await api.setMyShortDescription(p.short);
  } catch (err) {
    console.error("profil bot gagal diperbarui:", err);
  }
}
