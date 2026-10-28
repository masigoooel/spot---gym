"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { db, run } from "@/lib/db";
import { getSettings, getWorkoutSession, sessionSetara } from "@/lib/queries";
import { destroySession } from "@/lib/session";
import { pickOtherSetara } from "@/lib/setara";

export async function logout() {
  await destroySession();
  redirect("/masuk");
}

// tombol "ganti perbandingan" di kartu sesi terakhir (sama dengan /setara di bot)
export async function changeSetara(sessionId: string) {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const session = await getWorkoutSession(userId, sessionId, settings.timezone);
  if (!session) return;

  const current = sessionSetara(session, settings);
  const next = pickOtherSetara(session.volume, current?.item.id ?? null);
  if (!next) return;

  run(
    await db()
      .from("workout_sessions")
      .update({ compare_item: next.item.id })
      .eq("id", session.id)
      .eq("user_id", userId),
  );
  refresh();
}
