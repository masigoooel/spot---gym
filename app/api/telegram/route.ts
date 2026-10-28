import { webhookCallback } from "grammy";
import { createBot } from "@/lib/bot";

// webhook telegram setelah hosting (SPEC §9). dipasang lewat `npm run webhook -- <alamat vercel>`.
// telegram menyertakan header X-Telegram-Bot-Api-Secret-Token; tanpa secret yang cocok → 401.
export const maxDuration = 60;

let handle: ((request: Request) => Promise<Response>) | null = null;

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return new Response("bot belum disetel", { status: 500 });
  handle ??= webhookCallback(createBot(token), "std/http", {
    secretToken: secret,
    // kartu + rekap (gambar story) bisa agak lama; telegram mengulang update kalau tidak dijawab
    timeoutMilliseconds: 50_000,
  });
  return handle(request);
}
