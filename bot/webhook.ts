// pasang bot ke server (vercel) atau balik ke mode lokal.
//   npm run webhook -- https://alamat-app.vercel.app   → telegram mengirim update ke <alamat>/api/telegram
//   npm run webhook -- hapus                            → lepas webhook, supaya npm run bot bisa dipakai lagi
// env dibaca dari .env.local (TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET).

import { Api } from "grammy";
import { syncProfile } from "@/lib/bot/setup";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const arg = process.argv[2]?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum diisi di .env.local");
  if (!arg) throw new Error("pakai: npm run webhook -- https://alamat-app.vercel.app   atau   npm run webhook -- hapus");
  const api = new Api(token);

  if (arg === "hapus") {
    await api.deleteWebhook();
    console.log("webhook dilepas. sekarang bot bisa dijalankan lokal lagi pakai npm run bot.");
    return;
  }

  if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET belum diisi di .env.local");
  const url = `${arg.replace(/\/+$/, "")}/api/telegram`;
  if (!url.startsWith("https://")) throw new Error("alamat harus https:// (alamat dari vercel)");
  await api.setWebhook(url, { secret_token: secret, allowed_updates: ["message", "callback_query"] });
  await syncProfile(api);
  const info = await api.getWebhookInfo();
  console.log(`webhook terpasang: ${info.url}`);
  if (info.last_error_message) console.log(`error terakhir dari telegram: ${info.last_error_message}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
