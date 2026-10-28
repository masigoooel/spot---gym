"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { db, maybe, must, run } from "@/lib/db";
import { deletePersonalExercise, requestAccountDeletion } from "@/lib/hapus";
import { findExercise, normalizeName, type ExerciseRef } from "@/lib/parser";
import { destroySession } from "@/lib/session";
import { parseSettingsPatch } from "@/lib/settings";
import { buildSchedule, type SplitSchedule } from "@/lib/workout";

// simpan satu atau beberapa pengaturan. dipanggil tiap kali satu kontrol di profil berubah.
// ganti program → split di hari-hari yang sudah terjadwal disusun ulang sesuai program baru.
export async function saveSettings(input: unknown): Promise<{ ok: boolean; split_schedule?: SplitSchedule }> {
  const userId = await requireUserId();
  const patch = parseSettingsPatch(input);
  if (!patch || Object.keys(patch).length === 0) return { ok: false };

  if (patch.program && !patch.split_schedule) {
    const current = must(
      await db()
        .from("user_settings")
        .select("split_schedule")
        .eq("user_id", userId)
        .single<{ split_schedule: SplitSchedule }>(),
    );
    patch.split_schedule = buildSchedule(patch.program, Object.keys(current.split_schedule).map(Number));
  }

  run(await db().from("user_settings").update(patch).eq("user_id", userId));
  refresh();
  return { ok: true, split_schedule: patch.split_schedule };
}

const SPLITS = ["push", "pull", "legs", "upper", "lower", "full"];

// latihan yang boleh dipakai user: bawaan atau miliknya sendiri, belum digabung
async function ownedOrBuiltIn(userId: string, ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const rows = must(
    await db()
      .from("exercises")
      .select("id, user_id")
      .in("id", ids)
      .is("merged_into", null)
      .is("deleted_at", null)
      .returns<{ id: number; user_id: string | null }[]>(),
  );
  const allowed = new Set(rows.filter((r) => r.user_id === null || r.user_id === userId).map((r) => r.id));
  return ids.filter((id) => allowed.has(id));
}

// template latihan satu split milik user (urutan = urutan di daftar)
export async function saveTemplate(split: string, exerciseIds: unknown): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (!SPLITS.includes(split) || !Array.isArray(exerciseIds) || exerciseIds.length > 20) return { ok: false };
  if (!exerciseIds.every((id) => Number.isInteger(id))) return { ok: false };
  const ids = await ownedOrBuiltIn(userId, [...new Set(exerciseIds as number[])]);

  run(await db().from("split_templates").delete().eq("user_id", userId).eq("split", split));
  if (ids.length > 0) {
    run(
      await db()
        .from("split_templates")
        .insert(ids.map((exercise_id, position) => ({ user_id: userId, split, exercise_id, position }))),
    );
  }
  refresh();
  return { ok: true };
}

// kembali ke template bawaan
export async function resetTemplate(split: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (!SPLITS.includes(split)) return { ok: false };
  run(await db().from("split_templates").delete().eq("user_id", userId).eq("split", split));
  refresh();
  return { ok: true };
}

async function personalExercise(userId: string, id: number) {
  return maybe(
    await db()
      .from("exercises")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .is("merged_into", null)
      .is("deleted_at", null)
      .maybeSingle<{ id: number }>(),
  );
}

// ganti nama latihan pribadi; tidak boleh sama dengan nama/alias latihan lain
export async function renameExercise(id: number, input: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  const name = normalizeName(String(input));
  if (name.length < 2 || name.length > 40) return { ok: false, error: "namanya 2 sampai 40 huruf." };
  if (!Number.isInteger(id) || !(await personalExercise(userId, id))) return { ok: false };

  type Row = { id: number; slug: string; name: string; aliases: string[]; is_bodyweight: boolean };
  const others = must(
    await db()
      .from("exercises")
      .select("id, slug, name, aliases, is_bodyweight")
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .is("merged_into", null)
      .is("deleted_at", null)
      .neq("id", id)
      .returns<Row[]>(),
  );
  const catalog: ExerciseRef[] = others.map((r) => ({ ...r, isBodyweight: r.is_bodyweight }));
  const clash = findExercise(name, catalog);
  if (clash) return { ok: false, error: `nama itu udah dipakai ${clash.name}.` };

  run(await db().from("exercises").update({ name }).eq("id", id).eq("user_id", userId));
  refresh();
  return { ok: true };
}

// gabung latihan pribadi ke latihan bawaan: set, rekor, dan template ikut pindah
export async function mergeExercise(id: number, targetId: number): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (!Number.isInteger(id) || !Number.isInteger(targetId) || id === targetId) return { ok: false };
  if (!(await personalExercise(userId, id))) return { ok: false };
  const target = maybe(
    await db()
      .from("exercises")
      .select("id")
      .eq("id", targetId)
      .is("user_id", null)
      .maybeSingle<{ id: number }>(),
  );
  if (!target) return { ok: false };

  const move = { exercise_id: targetId };
  run(await db().from("sets").update(move).eq("user_id", userId).eq("exercise_id", id));
  run(await db().from("personal_records").update(move).eq("user_id", userId).eq("exercise_id", id));
  run(await db().from("split_templates").update(move).eq("user_id", userId).eq("exercise_id", id));
  run(await db().from("bot_state").update({ focus_exercise_id: targetId }).eq("user_id", userId).eq("focus_exercise_id", id));
  run(await db().from("exercises").update({ merged_into: targetId }).eq("id", id).eq("user_id", userId));
  refresh();
  return { ok: true };
}

// hapus latihan pribadi: set-setnya pindah ke "latihan lain", rekornya hilang
export async function deletePersonal(id: number): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (!Number.isInteger(id)) return { ok: false };
  const ok = await deletePersonalExercise(userId, id);
  refresh();
  return { ok };
}

// hapus akun: wajib ketik "hapus". akun + semua data benar-benar dihapus 7 hari lagi;
// sampai saat itu bisa dibatalkan lewat bot.
export async function deleteAccount(formData: FormData) {
  const userId = await requireUserId();
  if (String(formData.get("konfirmasi") ?? "").trim().toLowerCase() !== "hapus") return;
  await requestAccountDeletion(userId);
  await destroySession();
  redirect("/masuk?akun=dihapus");
}
