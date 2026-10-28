import { Api } from "grammy";
import { sendDue } from "@/lib/bot/istirahat";
import { runScheduledTasks } from "@/lib/bot/jadwal";

// dipanggil tiap 30 detik oleh pg_cron di supabase (supabase/cron.example.sql), dengan
// header Authorization: Bearer <CRON_SECRET>.
// pengingat istirahat dicek tiap panggilan; pesan terjadwal (pengingat latihan, "kemarin kelewat",
// rekap mingguan) cukup sekali semenit, di paruh pertama tiap menit.
export const maxDuration = 60;

export async function GET(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.CRON_SECRET;
  if (!token || !secret) return new Response("cron belum disetel", { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("bukan cron", { status: 401 });

  const api = new Api(token);
  const now = new Date();
  await sendDue(api, now);
  if (now.getUTCSeconds() < 30) await runScheduledTasks(api, now);
  return Response.json({ ok: true });
}
