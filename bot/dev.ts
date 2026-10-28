// jalankan bot lokal pakai long polling: npm run bot
// env dibaca dari .env.local lewat flag --env-file di script npm.
// pesan terjadwal (pengingat, "kemarin kelewat", rekap mingguan) dicek tiap menit selama bot jalan.

import { createBot } from "@/lib/bot";
import { runScheduledTasks } from "@/lib/bot/jadwal";
import { copy } from "@/lib/copy";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN belum diisi di .env.local");
    process.exit(1);
  }

  const bot = createBot(token);
  await bot.api.setMyCommands(copy.commands);
  // nama & deskripsi bot di telegram, diubah hanya kalau beda (setMyName dibatasi telegram)
  try {
    const p = copy.botProfile;
    if ((await bot.api.getMyName()).name !== p.name) await bot.api.setMyName(p.name);
    if ((await bot.api.getMyDescription()).description !== p.description) await bot.api.setMyDescription(p.description);
    if ((await bot.api.getMyShortDescription()).short_description !== p.short) await bot.api.setMyShortDescription(p.short);
  } catch (err) {
    console.error("profil bot gagal diperbarui:", err);
  }

  const tick = () => runScheduledTasks(bot.api).catch((err) => console.error("pesan terjadwal gagal:", err));
  const timer = setInterval(tick, 60_000);
  void tick();

  const stop = () => {
    clearInterval(timer);
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
