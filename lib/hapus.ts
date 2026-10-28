// hapus & urungkan (SPEC §3 "hapus (soft delete)"): dipakai bot dan web.
// data tidak langsung dihapus: diberi deleted_at, lalu semua turunannya dihitung ulang
// (total sesi, pr latihan terkait). baris yang sudah 30 hari dihapus permanen oleh job harian.

import { all, db, maybe, must, run } from "@/lib/db";
import { detectPr, sessionVolume, successfulReps } from "@/lib/workout";

const PURGE_AFTER_DAYS = 30;
const ACCOUNT_GRACE_DAYS = 7;

// ---------- hitung ulang ----------

// total_volume & set_count sesi dari set yang belum dihapus
export async function recomputeSession(userId: string, sessionId: string) {
  type Row = { weight_kg: number | null; is_added: boolean; reps: number | null };
  const rows = must(
    await db()
      .from("sets")
      .select("weight_kg, is_added, reps")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .returns<Row[]>(),
  );
  const totals = {
    total_volume: sessionVolume(
      rows.map((r) => ({ weightKg: r.weight_kg === null ? null : Number(r.weight_kg), isAdded: r.is_added, reps: r.reps })),
    ),
    set_count: rows.length,
  };
  run(await db().from("workout_sessions").update(totals).eq("id", sessionId).eq("user_id", userId));
  return { totalVolume: totals.total_volume, setCount: totals.set_count };
}

// riwayat pr satu latihan disusun ulang dari set yang belum dihapus, dengan aturan yang
// sama seperti saat mencatat: satu pesan paling banyak satu pr, set pertama jadi patokan.
export async function rebuildPrs(userId: string, exerciseId: number) {
  type Row = {
    id: string;
    session_id: string;
    weight_kg: number;
    is_added: boolean;
    reps: number | null;
    failed: boolean;
    raw_text: string | null;
    created_at: string;
  };
  const rows = await all<Row>((from, to) =>
    db()
      .from("sets")
      .select("id, session_id, weight_kg, is_added, reps, failed, raw_text, created_at")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .is("deleted_at", null)
      .not("weight_kg", "is", null)
      .not("reps", "is", null)
      .order("created_at")
      .order("id")
      .range(from, to)
      .returns<Row[]>(),
  );

  // set dari satu pesan: sesi + teks asli + detik yang sama
  const groups: Row[][] = [];
  for (const r of rows) {
    const key = (x: Row) => `${x.session_id}|${x.raw_text}|${x.created_at.slice(0, 19)}`;
    const last = groups[groups.length - 1];
    if (last && key(last[0]) === key(r)) last.push(r);
    else groups.push([r]);
  }

  const records: Record<string, unknown>[] = [];
  let best: number | null = null;
  for (const group of groups) {
    const sets = group.map((r) => ({
      weightKg: Number(r.weight_kg),
      isAdded: r.is_added,
      reps: r.reps,
      failed: r.failed,
    }));
    const pr = detectPr(best, sets);
    if (pr) {
      records.push({
        user_id: userId,
        exercise_id: exerciseId,
        set_id: group[pr.index].id,
        weight_kg: pr.weightKg,
        reps: pr.reps,
        e1rm: pr.e1rm,
        previous_weight_kg: pr.previousWeightKg,
        achieved_at: group[pr.index].created_at,
      });
    }
    for (const s of sets) if (successfulReps(s) >= 1) best = Math.max(best ?? -Infinity, s.weightKg);
  }

  run(await db().from("personal_records").delete().eq("user_id", userId).eq("exercise_id", exerciseId));
  if (records.length) run(await db().from("personal_records").insert(records));
}

// beban terberat sekarang (dari set yang belum dihapus), null kalau belum ada.
// `except` = anggap set / sesi itu sudah terhapus (untuk kalimat "pr balik ke …")
export async function currentBestKg(
  userId: string,
  exerciseId: number,
  except: { setId?: string; sessionId?: string } = {},
): Promise<number | null> {
  let q = db()
    .from("sets")
    .select("weight_kg")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .is("deleted_at", null)
    .not("weight_kg", "is", null)
    .not("reps", "is", null)
    .or("failed.eq.false,reps.gt.1");
  if (except.setId) q = q.neq("id", except.setId);
  if (except.sessionId) q = q.neq("session_id", except.sessionId);
  const row = maybe(await q.order("weight_kg", { ascending: false }).limit(1).maybeSingle<{ weight_kg: number }>());
  return row ? Number(row.weight_kg) : null;
}

// ---------- satu set ----------

export type SetInfo = {
  id: string;
  sessionId: string;
  exerciseId: number;
  exerciseName: string;
  order: number;
  weightKg: number | null;
  isAdded: boolean;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;
  deleted: boolean;
};

export async function getSetInfo(userId: string, setId: string): Promise<SetInfo | null> {
  type Row = {
    id: string;
    session_id: string;
    exercise_id: number;
    set_order: number;
    weight_kg: number | null;
    is_added: boolean;
    reps: number | null;
    duration_sec: number | null;
    distance_m: number | null;
    deleted_at: string | null;
    exercises: { name: string } | null;
  };
  const { data, error } = await db()
    .from("sets")
    .select(
      "id, session_id, exercise_id, set_order, weight_kg, is_added, reps, duration_sec, distance_m, deleted_at, exercises(name)",
    )
    .eq("id", setId)
    .eq("user_id", userId)
    .maybeSingle<Row>();
  if (error?.code === "22P02") return null; // id bukan uuid
  run({ error });
  if (!data) return null;
  return {
    id: data.id,
    sessionId: data.session_id,
    exerciseId: data.exercise_id,
    exerciseName: data.exercises?.name ?? "?",
    order: data.set_order,
    weightKg: data.weight_kg === null ? null : Number(data.weight_kg),
    isAdded: data.is_added,
    reps: data.reps,
    durationSec: data.duration_sec,
    distanceM: data.distance_m,
    deleted: data.deleted_at !== null,
  };
}

// akibat menghapus satu set, untuk kalimat konfirmasi: apakah set ini pr, dan pr jadi berapa
export async function setDeleteImpact(userId: string, set: SetInfo) {
  const pr = maybe(
    await db().from("personal_records").select("id").eq("user_id", userId).eq("set_id", set.id).maybeSingle(),
  );
  if (!pr || set.weightKg === null) return { isPr: false, prAfterKg: null as number | null };
  // pr lama yang sudah dilewati tidak dihitung: yang penting rekor yang berlaku sekarang
  const after = await currentBestKg(userId, set.exerciseId, { setId: set.id });
  return after === null || set.weightKg > after ? { isPr: true, prAfterKg: after } : { isPr: false, prAfterKg: null };
}

// ubah satu set (dari riwayat web). nilai sudah dalam kg / detik / meter dan sudah divalidasi.
export async function updateSet(
  userId: string,
  setId: string,
  values: {
    weightKg: number | null;
    reps: number | null;
    failed: boolean;
    durationSec: number | null;
    distanceM: number | null;
  },
): Promise<SetInfo | null> {
  const set = await getSetInfo(userId, setId);
  if (!set || set.deleted) return null;
  run(
    await db()
      .from("sets")
      .update({
        weight_kg: values.weightKg,
        reps: values.reps,
        failed: values.reps === null ? false : values.failed,
        duration_sec: values.durationSec,
        distance_m: values.distanceM,
      })
      .eq("id", setId)
      .eq("user_id", userId),
  );
  await recomputeSession(userId, set.sessionId);
  await rebuildPrs(userId, set.exerciseId);
  return set;
}

export async function deleteSet(userId: string, setId: string): Promise<SetInfo | null> {
  const set = await getSetInfo(userId, setId);
  if (!set || set.deleted) return null;
  run(
    await db()
      .from("sets")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", setId)
      .eq("user_id", userId),
  );
  await recomputeSession(userId, set.sessionId);
  await rebuildPrs(userId, set.exerciseId);
  return set;
}

export async function restoreSet(userId: string, setId: string): Promise<SetInfo | null> {
  const set = await getSetInfo(userId, setId);
  if (!set || !set.deleted) return null;
  run(await db().from("sets").update({ deleted_at: null }).eq("id", setId).eq("user_id", userId));
  // sesinya ikut dipulihkan kalau ternyata sesinya juga sudah dihapus
  run(
    await db()
      .from("workout_sessions")
      .update({ deleted_at: null })
      .eq("id", set.sessionId)
      .eq("user_id", userId),
  );
  await recomputeSession(userId, set.sessionId);
  await rebuildPrs(userId, set.exerciseId);
  return set;
}

// set terakhir di sesi yang belum dihapus (untuk /batal)
export async function lastSetId(userId: string, sessionId: string): Promise<string | null> {
  const row = maybe(
    await db()
      .from("sets")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>(),
  );
  return row?.id ?? null;
}

// ---------- satu sesi ----------

// rekor yang berlaku sekarang dan ikut hilang kalau sesi ini dihapus: [{ latihan, pr jadi berapa }]
export async function sessionDeleteImpact(
  userId: string,
  sessionId: string,
  sets: { id: string; exerciseId: number; name: string; weightKg: number | null }[],
  prSetIds: Set<string>,
) {
  const out: { name: string; prAfterKg: number | null }[] = [];
  for (const exerciseId of new Set(sets.filter((s) => prSetIds.has(s.id)).map((s) => s.exerciseId))) {
    const mine = sets.filter((s) => s.exerciseId === exerciseId && s.weightKg !== null);
    const top = Math.max(...mine.map((s) => s.weightKg!));
    const after = await currentBestKg(userId, exerciseId, { sessionId });
    if (after === null || top > after) out.push({ name: mine[0].name, prAfterKg: after });
  }
  return out;
}

async function sessionExercises(userId: string, sessionId: string) {
  const rows = must(
    await db()
      .from("sets")
      .select("exercise_id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .returns<{ exercise_id: number }[]>(),
  );
  return [...new Set(rows.map((r) => r.exercise_id))];
}

// sesi + semua setnya diberi deleted_at yang sama, supaya urungkan hanya memulihkan
// set yang ikut terhapus bersama sesinya (bukan set yang sudah dihapus sendiri sebelumnya)
export async function deleteSession(userId: string, sessionId: string): Promise<boolean> {
  const stamp = new Date().toISOString();
  const updated = must(
    await db()
      .from("workout_sessions")
      .update({ deleted_at: stamp })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id"),
  );
  if (updated.length === 0) return false;
  run(
    await db()
      .from("sets")
      .update({ deleted_at: stamp })
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .is("deleted_at", null),
  );
  for (const exerciseId of await sessionExercises(userId, sessionId)) await rebuildPrs(userId, exerciseId);
  return true;
}

export async function restoreSession(userId: string, sessionId: string): Promise<boolean> {
  const row = maybe(
    await db()
      .from("workout_sessions")
      .select("deleted_at")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle<{ deleted_at: string | null }>(),
  );
  if (!row?.deleted_at) return false;
  run(
    await db()
      .from("sets")
      .update({ deleted_at: null })
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .eq("deleted_at", row.deleted_at),
  );
  run(await db().from("workout_sessions").update({ deleted_at: null }).eq("id", sessionId).eq("user_id", userId));
  await recomputeSession(userId, sessionId);
  for (const exerciseId of await sessionExercises(userId, sessionId)) await rebuildPrs(userId, exerciseId);
  return true;
}

// ---------- latihan pribadi ----------

// hapus latihan pribadi: set-setnya pindah ke latihan "lain", lalu latihannya diberi deleted_at
export async function deletePersonalExercise(userId: string, exerciseId: number): Promise<boolean> {
  const own = maybe(
    await db()
      .from("exercises")
      .select("id")
      .eq("id", exerciseId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle<{ id: number }>(),
  );
  const lain = maybe(
    await db().from("exercises").select("id").eq("slug", "lain").is("user_id", null).maybeSingle<{ id: number }>(),
  );
  if (!own || !lain) return false;

  const move = { exercise_id: lain.id };
  run(await db().from("sets").update(move).eq("user_id", userId).eq("exercise_id", exerciseId));
  run(await db().from("personal_records").delete().eq("user_id", userId).eq("exercise_id", exerciseId));
  run(await db().from("split_templates").delete().eq("user_id", userId).eq("exercise_id", exerciseId));
  run(await db().from("bot_state").update({ focus_exercise_id: null }).eq("user_id", userId).eq("focus_exercise_id", exerciseId));
  run(
    await db()
      .from("exercises")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", exerciseId)
      .eq("user_id", userId),
  );
  await rebuildPrs(userId, lain.id);
  return true;
}

// ---------- akun ----------

export async function requestAccountDeletion(userId: string) {
  run(await db().from("users").update({ delete_requested_at: new Date().toISOString() }).eq("id", userId));
}

export async function cancelAccountDeletion(userId: string) {
  run(await db().from("users").update({ delete_requested_at: null }).eq("id", userId));
}

// tanggal akun benar-benar dihapus
export const accountDeletionDate = (requestedAt: Date) =>
  new Date(requestedAt.getTime() + ACCOUNT_GRACE_DAYS * 86_400_000);

// ---------- job harian: hapus permanen ----------

export async function purgeDeleted(now = new Date()) {
  const cutoff = new Date(now.getTime() - PURGE_AFTER_DAYS * 86_400_000).toISOString();
  run(await db().from("sets").delete().lt("deleted_at", cutoff));
  run(await db().from("workout_sessions").delete().lt("deleted_at", cutoff));
  // latihan pribadi yang dihapus sudah tidak punya set (dipindah ke "lain" saat dihapus)
  run(await db().from("exercises").delete().lt("deleted_at", cutoff).not("user_id", "is", null));
  // akun yang minta dihapus lebih dari 7 hari lalu: semua datanya ikut terhapus (on delete cascade)
  const graceCutoff = new Date(now.getTime() - ACCOUNT_GRACE_DAYS * 86_400_000).toISOString();
  run(await db().from("users").delete().lt("delete_requested_at", graceCutoff));
}
