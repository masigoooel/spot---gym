"use server";

import { Api, InputFile } from "grammy";
import { requireUserId } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { db, must, run } from "@/lib/db";
import { getSettings, getWorkoutSession, sessionSetara } from "@/lib/queries";
import { findItem, pickOtherSetara } from "@/lib/setara";
import { getStoryData, storyPng } from "@/lib/story";
import { STORY_STYLES, type StoryOptions } from "@/lib/story-options";

// ganti benda setara sesi ini: id benda tertentu, atau "acak" untuk benda lain yang angkanya masih masuk akal
export async function chooseStoryItem(sessionId: string, choice: string): Promise<{ ok: boolean; itemId?: string }> {
  const userId = await requireUserId();
  if (choice !== "acak" && !findItem(choice)) return { ok: false };

  const settings = await getSettings(userId);
  const session = await getWorkoutSession(userId, sessionId, settings.timezone);
  if (!session) return { ok: false };

  let itemId = choice;
  if (choice === "acak") {
    const next = pickOtherSetara(session.volume, sessionSetara(session, settings)?.item.id ?? null);
    if (!next) return { ok: false };
    itemId = next.item.id;
  }

  run(
    await db()
      .from("workout_sessions")
      .update({ compare_item: itemId })
      .eq("id", session.id)
      .eq("user_id", userId),
  );
  return { ok: true, itemId };
}

function parseOptions(input: unknown): StoryOptions | null {
  if (typeof input !== "object" || input === null) return null;
  const { style, stats, pr } = input as Record<string, unknown>;
  if (typeof style !== "string" || !(style in STORY_STYLES)) return null;
  if (typeof stats !== "boolean" || typeof pr !== "boolean") return null;
  return { style: style as StoryOptions["style"], stats, pr };
}

// kirim kartu ke chat telegram milik user sendiri, lewat bot
export async function sendStoryToTelegram(sessionId: string, input: unknown): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const options = parseOptions(input);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!options || !token) return { ok: false };

  const data = await getStoryData(userId, sessionId);
  if (!data) return { ok: false };

  const { telegram_id } = must(
    await db().from("users").select("telegram_id").eq("id", userId).single<{ telegram_id: number }>(),
  );
  try {
    await new Api(token).sendPhoto(telegram_id, new InputFile(await storyPng(data, options), "spot-story.png"), {
      caption: copy.storyCaption,
    });
    return { ok: true };
  } catch (err) {
    // mis. user belum pernah /start bot atau memblokirnya
    console.error("kirim kartu story ke telegram gagal:", err);
    return { ok: false };
  }
}
