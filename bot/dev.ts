// jalankan bot lokal pakai long polling: npm run bot
// env dibaca dari .env.local lewat flag --env-file di script npm.
// pesan terjadwal (pengingat, "kemarin kelewat", rekap mingguan) dicek tiap menit,
// pengingat istirahat tiap 10 detik, selama bot jalan.

import { createBot } from "@/lib/bot";
import { sendDue } from "@/lib/bot/istirahat";
import { runScheduledTasks } from "@/lib/bot/jadwal";
import { syncProfile } from "@/lib/bot/setup";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN belum diisi di .env.local");
    process.exit(1);
  }

  const bot = createBot(token);
  // bot.start() menghapus webhook. kalau bot ini sudah dipasang di vercel, jangan direbut dari server.
  const hook = await bot.api.getWebhookInfo();
  if (hook.url) {
    console.error(
      `bot ini sudah jalan di server (webhook ${hook.url}).\n` +
        "npm run bot tidak dijalankan supaya bot di server tetap hidup.\n" +
        "mau balik ke mode lokal? jalankan dulu: npm run webhook -- hapus",
    );
    process.exit(1);
  }
  await syncProfile(bot.api);

  const tick = () => runScheduledTasks(bot.api).catch((err) => console.error("pesan terjadwal gagal:", err));
  const restTick = () => sendDue(bot.api).catch((err) => console.error("pengingat istirahat gagal:", err));
  const timers = [setInterval(tick, 60_000), setInterval(restTick, 10_000)];
  void tick();

  const stop = () => {
    timers.forEach(clearInterval);
    void bot.stop();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  await bot.start({
    onStart: (me) => console.log(`spotter (spot.) jalan sebagai @${me.username} (long polling). ctrl+c untuk berhenti.`),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
