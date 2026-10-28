// akses database untuk bot. semua query difilter user_id milik pengirim pesan.

import { all, db, maybe, must, run } from "@/lib/db";
import { recomputeSession } from "@/lib/hapus";
import type { CardSet } from "@/lib/card";
import { normalizeKey } from "@/lib/exercise-match";
import type { ExerciseKind, ExerciseRef, ParsedSet } from "@/lib/parser";
import { toSettings, USER_WITH_SETTINGS, type Program, type Settings, type UserRow } from "@/lib/queries";
import {
  SESSION_IDLE_MS,
  localDate,
  weekStart,
  type DayStatus,
  type Feel,
  type NewPr,
  type SplitSchedule,
} from "@/lib/workout";

export { bestSets, getWeekStatuses, sessionDates, type BestSet } from "@/lib/queries";

export type TelegramUser = { id: number; username?: string; first_name: string; last_name?: string };

export type User = Settings & { id: string };

export type Session = {
  id: string;
  split: string | null;
  startedAt: Date;
  setCount: number;
  lastActivityAt: Date;
  backdated: boolean;
};

const isUniqueViolation = (error: { code?: string } | null) => error?.code === "23505";

// ---------- user ----------

// daftar otomatis: buat users + user_settings kalau belum ada
export async function ensureUser(from: TelegramUser): Promise<{ user: User; created: boolean }> {
  const select = () => db().from("users").select(USER_WITH_SETTINGS);
  const existing = maybe(await select().eq("telegram_id", from.id).maybeSingle<UserRow>());
  if (existing) return { user: { id: existing.id, ...toSettings(existing) }, created: false };

  const displayName = [from.first_name, from.last_name].filter(Boolean).join(" ");
  const created = must(
    await db()
      .from("users")
      .upsert(
        { telegram_id: from.id, username: from.username ?? null, display_name: displayName },
        { onConflict: "telegram_id" },
      )
      .select("id")
      .single<{ id: string }>(),
  );
  run(await db().from("user_settings").upsert({ user_id: created.id }, { onConflict: "user_id", ignoreDuplicates: true }));
  const row = must(await select().eq("id", created.id).single<UserRow>());
  return { user: { id: row.id, ...toSettings(row) }, created: true };
}

// cari user tanpa mendaftarkan (null kalau belum pernah chat)
export async function findUser(telegramId: number): Promise<User | null> {
  const row = maybe(await db().from("users").select(USER_WITH_SETTINGS).eq("telegram_id", telegramId).maybeSingle<UserRow>());
  return row ? { id: row.id, ...toSettings(row) } : null;
}

// semua user + pengaturannya, untuk pesan terjadwal
export async function allUsers(): Promise<User[]> {
  const rows = await all<UserRow>((from, to) =>
    db().from("users").select(USER_WITH_SETTINGS).order("id").range(from, to).returns<UserRow[]>(),
  );
  return rows.map((r) => ({ id: r.id, ...toSettings(r) }));
}

export async function saveOnboarding(
  userId: string,
  setup: { program: Program; weeklyTarget: number; schedule: SplitSchedule },
) {
  run(
    await db()
      .from("user_settings")
      .update({ program: setup.program, weekly_target: setup.weeklyTarget, split_schedule: setup.schedule })
      .eq("user_id", userId),
  );
}

// ---------- latihan ----------

type ExerciseRaw = {
  id: number;
  slug: string;
  name: string;
  aliases: string[];
  is_bodyweight: boolean;
  muscle: string;
  equipment: string;
  alternatives: string[];
  kind: ExerciseKind;
};
const EXERCISE_COLUMNS = "id, slug, name, aliases, is_bodyweight, muscle, equipment, alternatives, kind";

const toRef = (r: ExerciseRaw): ExerciseRef => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  aliases: r.aliases,
  isBodyweight: r.is_bodyweight,
  muscle: r.muscle,
  equipment: r.equipment,
  alternatives: r.alternatives,
  kind: r.kind,
});

// latihan bawaan + latihan pribadi user (yang belum digabung ke latihan lain).
// alias pribadi (user_aliases) ikut ditempel ke alias latihannya, jadi parser langsung mengenali.
export async function getCatalog(userId: string): Promise<ExerciseRef[]> {
  const [rows, own] = await Promise.all([
    all<ExerciseRaw>((from, to) =>
      db()
        .from("exercises")
        .select(EXERCISE_COLUMNS)
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .is("merged_into", null)
        .is("deleted_at", null)
        .order("id")
        .range(from, to)
        .returns<ExerciseRaw[]>(),
    ),
    db().from("user_aliases").select("alias, exercise_id").eq("user_id", userId).returns<{ alias: string; exercise_id: number }[]>(),
  ]);
  // tabel alias belum ada (migration 0006 belum jalan) → tanpa alias pribadi
  const aliases = new Map<number, string[]>();
  for (const a of own.data ?? []) aliases.set(a.exercise_id, [...(aliases.get(a.exercise_id) ?? []), a.alias]);
  return rows.map((r) => {
    const ref = toRef(r);
    const extra = aliases.get(r.id);
    return extra ? { ...ref, aliases: [...ref.aliases, ...extra] } : ref;
  });
}

// teks yang diketik user lalu dipastikan lewat tombol → alias pribadi
export async function saveUserAlias(userId: string, text: string, exerciseId: number) {
  const alias = normalizeKey(text);
  if (alias.length < 2 || alias.length > 60) return;
  await db()
    .from("user_aliases")
    .upsert({ user_id: userId, alias, exercise_id: exerciseId }, { onConflict: "user_id,alias" });
}

export async function createExercise(
  userId: string,
  name: string,
  info: { isBodyweight: boolean; muscle: string; equipment: string; kind: ExerciseKind },
): Promise<ExerciseRef> {
  // slug unik global, jadi latihan pribadi diberi akhiran id user
  const base = name.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "latihan";
  const row = must(
    await db()
      .from("exercises")
      .insert({
        slug: `${base}--${userId.slice(0, 8)}-${Date.now().toString(36)}`,
        name,
        is_bodyweight: info.isBodyweight,
        muscle: info.muscle,
        equipment: info.equipment,
        kind: info.kind,
        user_id: userId,
      })
      .select(EXERCISE_COLUMNS)
      .single<ExerciseRaw>(),
  );
  return toRef(row);
}

// template latihan per split: punya user kalau ada, kalau belum pakai bawaan
// `own` = template milik user (diatur di profil), bukan template bawaan
export async function getTemplate(userId: string, split: string): Promise<{ ids: number[]; own: boolean }> {
  const rows = must(
    await db()
      .from("split_templates")
      .select("user_id, exercise_id, position")
      .eq("split", split)
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order("position")
      .returns<{ user_id: string | null; exercise_id: number; position: number }[]>(),
  );
  const own = rows.filter((r) => r.user_id === userId);
  if (own.length > 0) return { ids: own.map((r) => r.exercise_id), own: true };
  return { ids: rows.filter((r) => r.user_id === null).map((r) => r.exercise_id), own: false };
}

// latihan yang paling sering dilatih belakangan, untuk split "bebas" (tanpa template)
export async function recentExerciseIds(userId: string, limit = 6): Promise<number[]> {
  const rows = must(
    await db()
      .from("sets")
      .select("exercise_id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<{ exercise_id: number }[]>(),
  );
  const count = new Map<number, number>();
  for (const r of rows) count.set(r.exercise_id, (count.get(r.exercise_id) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
}

// "sering kamu pakai": latihan yang muncul di paling banyak sesi split ini (8 minggu terakhir)
export async function frequentExerciseIds(userId: string, split: string | null, now: Date, limit = 4) {
  type Row = { exercise_id: number; session_id: string };
  const since = new Date(now.getTime() - 56 * 86_400_000).toISOString();
  const rows = await all<Row>((from, to) => {
    let q = db()
      .from("sets")
      .select("exercise_id, session_id, workout_sessions!inner(split)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("created_at", since);
    if (split && split !== "bebas") q = q.eq("workout_sessions.split", split);
    return q.order("id").range(from, to).returns<Row[]>();
  });
  const sessions = new Map<number, Set<string>>();
  for (const r of rows) {
    if (!sessions.has(r.exercise_id)) sessions.set(r.exercise_id, new Set());
    sessions.get(r.exercise_id)!.add(r.session_id);
  }
  return [...sessions.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, limit)
    .map(([id]) => id);
}

// set durasi & kardio di satu sesi, untuk baris tambahan rekap
export async function sessionTimedSets(userId: string, sessionId: string) {
  type Row = {
    exercise_id: number;
    duration_sec: number | null;
    distance_m: number | null;
    exercises: { name: string; kind: ExerciseKind } | null;
  };
  const rows = must(
    await db()
      .from("sets")
      .select("exercise_id, duration_sec, distance_m, exercises(name, kind)")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .is("reps", null)
      .order("created_at")
      .returns<Row[]>(),
  );
  return rows.map((r) => ({
    exerciseId: r.exercise_id,
    name: r.exercises?.name ?? "?",
    kind: r.exercises?.kind ?? "durasi",
    durationSec: r.duration_sec,
    distanceM: r.distance_m,
  }));
}

// ---------- kartu latihan ----------

type CardRow = {
  weight_kg: number | null;
  is_added: boolean;
  reps: number | null;
  duration_sec: number | null;
  distance_m: number | null;
  failed: boolean;
};
const CARD_COLUMNS = "weight_kg, is_added, reps, duration_sec, distance_m, failed";
const toCardSet = (r: CardRow): CardSet => ({
  weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
  isAdded: r.is_added,
  reps: r.reps,
  durationSec: r.duration_sec,
  distanceM: r.distance_m,
  ...(r.failed ? { failed: true } : {}),
});

// set latihan ini di sesi terakhir sebelum sesi sekarang (untuk angka otomatis di kartu)
export async function previousExerciseSession(userId: string, exerciseId: number, exceptSessionId: string | null) {
  let q = db()
    .from("sets")
    .select("session_id, workout_sessions!inner(started_at, feel, deleted_at)")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .is("deleted_at", null)
    .is("workout_sessions.deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (exceptSessionId) q = q.neq("session_id", exceptSessionId);
  type Row = { session_id: string; workout_sessions: { started_at: string; feel: Feel | null } };
  const last = maybe(await q.maybeSingle<Row>());
  if (!last) return null;
  return {
    startedAt: new Date(last.workout_sessions.started_at),
    feel: last.workout_sessions.feel,
    sets: await exerciseSetsInSession(userId, last.session_id, exerciseId),
  };
}

// set satu latihan di satu sesi, urut
export async function exerciseSetsInSession(userId: string, sessionId: string, exerciseId: number): Promise<CardSet[]> {
  const rows = must(
    await db()
      .from("sets")
      .select(CARD_COLUMNS)
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .eq("exercise_id", exerciseId)
      .is("deleted_at", null)
      .order("set_order")
      .order("created_at")
      .returns<CardRow[]>(),
  );
  return rows.map(toCardSet);
}

// set terakhir latihan ini di sesi ini (untuk ↩️ hapus set terakhir di kartu, dan cek tekan dua kali)
export async function lastExerciseSet(userId: string, sessionId: string, exerciseId: number) {
  const row = maybe(
    await db()
      .from("sets")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .eq("exercise_id", exerciseId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; created_at: string }>(),
  );
  return row ? { id: row.id, createdAt: new Date(row.created_at) } : null;
}

// urutan latihan di sesi terakhir split ini (urutan set pertama tiap latihan)
export async function lastSplitOrder(userId: string, split: string, exceptSessionId: string | null): Promise<number[]> {
  let q = db()
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("split", split)
    .gt("set_count", 0)
    .is("deleted_at", null)
    .order("started_at", { ascending: false })
    .limit(1);
  if (exceptSessionId) q = q.neq("id", exceptSessionId);
  const session = maybe(await q.maybeSingle<{ id: string }>());
  return session ? sessionExerciseIds(userId, session.id) : [];
}

// sesi yang sudah selesai (untuk tips di kartu selama 3 sesi pertama)
export async function finishedSessionCount(userId: string): Promise<number> {
  const { count } = await db()
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("set_count", 0)
    .not("ended_at", "is", null)
    .is("deleted_at", null);
  return count ?? 0;
}

// ---------- sesi ----------

async function findOpenSession(userId: string, backdated: boolean): Promise<Session | null> {
  type Row = { id: string; split: string | null; started_at: string; set_count: number; backdated: boolean };
  const row = maybe(
    await db()
      .from("workout_sessions")
      .select("id, split, started_at, set_count, backdated")
      .eq("user_id", userId)
      .eq("backdated", backdated)
      .is("ended_at", null)
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle<Row>(),
  );
  if (!row) return null;

  const last = maybe(
    await db()
      .from("sets")
      .select("created_at")
      .eq("session_id", row.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>(),
  );
  return {
    id: row.id,
    split: row.split,
    startedAt: new Date(row.started_at),
    setCount: row.set_count,
    lastActivityAt: new Date(last?.created_at ?? row.started_at),
    backdated: row.backdated,
  };
}

export const isIdle = (s: Session, now: Date) => now.getTime() - s.lastActivityAt.getTime() > SESSION_IDLE_MS;

// sesi yang masih jalan. sesi yang diam lebih dari 3 jam ditutup di sini
// (pada aktivitas berikutnya), kecuali diminta `keepIdle` oleh /selesai.
// sesi /kemarin tidak dicek diamnya: waktunya memang mundur sehari.
export async function getActiveSession(
  userId: string,
  now: Date,
  { keepIdle = false, backdated = false } = {},
): Promise<Session | null> {
  const session = await findOpenSession(userId, backdated);
  if (!session) return null;
  if (!backdated && !keepIdle && isIdle(session, now)) {
    await closeSession(userId, session.id, session.lastActivityAt);
    return null;
  }
  return session;
}

export async function openSession(
  userId: string,
  split: string | null,
  startedAt: Date,
  { backdated = false } = {},
): Promise<Session> {
  const row = must(
    await db()
      .from("workout_sessions")
      .insert({ user_id: userId, split, started_at: startedAt.toISOString(), backdated })
      .select("id")
      .single<{ id: string }>(),
  );
  return { id: row.id, split, startedAt, setCount: 0, lastActivityAt: startedAt, backdated };
}

export async function updateSessionSplit(userId: string, sessionId: string, split: string | null) {
  run(await db().from("workout_sessions").update({ split }).eq("id", sessionId).eq("user_id", userId));
}

export async function closeSession(userId: string, sessionId: string, endedAt: Date) {
  run(
    await db()
      .from("workout_sessions")
      .update({ ended_at: endedAt.toISOString() })
      .eq("id", sessionId)
      .eq("user_id", userId),
  );
}

export async function deleteSession(userId: string, sessionId: string) {
  run(await db().from("workout_sessions").delete().eq("id", sessionId).eq("user_id", userId));
}

export async function getSessionInfo(userId: string, sessionId: string) {
  const row = maybe(
    await db()
      .from("workout_sessions")
      .select("split, started_at")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle<{ split: string | null; started_at: string }>(),
  );
  return row ? { split: row.split, startedAt: new Date(row.started_at) } : null;
}

export async function setFeel(userId: string, sessionId: string, feel: Feel) {
  run(await db().from("workout_sessions").update({ feel }).eq("id", sessionId).eq("user_id", userId));
}

// latihan yang sudah dikerjakan di sesi ini, urut dari yang pertama
export async function sessionExerciseIds(userId: string, sessionId: string): Promise<number[]> {
  const rows = must(
    await db()
      .from("sets")
      .select("exercise_id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at")
      .returns<{ exercise_id: number }[]>(),
  );
  return [...new Set(rows.map((r) => r.exercise_id))];
}

// sesi yang punya set di tanggal lokal tertentu (cek "hari ini udah latihan")
export async function hasSessionOn(userId: string, day: string, timeZone: string): Promise<boolean> {
  const from = new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString();
  const to = new Date(Date.parse(`${day}T00:00:00Z`) + 2 * 86_400_000).toISOString();
  const rows = must(
    await db()
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .gt("set_count", 0)
      .is("deleted_at", null)
      .gte("started_at", from)
      .lt("started_at", to)
      .returns<{ started_at: string }[]>(),
  );
  return rows.some((r) => localDate(new Date(r.started_at), timeZone) === day);
}

export async function addSets(
  userId: string,
  sessionId: string,
  exerciseId: number,
  sets: ParsedSet[],
  rawText: string,
  at: Date,
) {
  // urutan set latihan ini di sesi: lanjut dari set yang sudah ada
  const { count } = await db()
    .from("sets")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("exercise_id", exerciseId)
    .is("deleted_at", null);
  const firstOrder = (count ?? 0) + 1;

  // created_at dibuat beda tiap set supaya /batal bisa tahu mana set terakhir
  const rows = sets.map((s, i) => ({
    session_id: sessionId,
    user_id: userId,
    exercise_id: exerciseId,
    weight_kg: s.weightKg,
    is_added: s.isAdded,
    reps: s.reps,
    duration_sec: s.durationSec,
    distance_m: s.distanceM,
    failed: s.failed,
    is_drop: s.isDrop,
    set_order: firstOrder + i,
    raw_text: rawText,
    created_at: new Date(at.getTime() + i).toISOString(),
  }));
  const inserted = must(
    await db().from("sets").insert(rows).select("id, created_at").returns<{ id: string; created_at: string }[]>(),
  );
  const ids = inserted.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((r) => r.id);
  return { ids, firstOrder, ...(await recomputeSession(userId, sessionId)) };
}

// berat terberat sebelumnya di latihan ini (set dengan minimal 1 rep berhasil)
export async function previousBestKg(userId: string, exerciseId: number): Promise<number | null> {
  const row = maybe(
    await db()
      .from("sets")
      .select("weight_kg")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .is("deleted_at", null)
      .not("weight_kg", "is", null)
      .not("reps", "is", null)
      .or("failed.eq.false,reps.gt.1")
      .order("weight_kg", { ascending: false })
      .limit(1)
      .maybeSingle<{ weight_kg: number }>(),
  );
  return row ? Number(row.weight_kg) : null;
}

// durasi terlama sebelumnya (patokan pr latihan durasi)
export async function previousBestSec(userId: string, exerciseId: number): Promise<number | null> {
  const row = maybe(
    await db()
      .from("sets")
      .select("duration_sec")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .is("deleted_at", null)
      .not("duration_sec", "is", null)
      .order("duration_sec", { ascending: false })
      .limit(1)
      .maybeSingle<{ duration_sec: number }>(),
  );
  return row?.duration_sec ?? null;
}

export async function insertPr(userId: string, exerciseId: number, setId: string, pr: NewPr, achievedAt: Date) {
  run(
    await db().from("personal_records").insert({
      user_id: userId,
      exercise_id: exerciseId,
      set_id: setId,
      weight_kg: pr.weightKg,
      reps: pr.reps,
      e1rm: pr.e1rm,
      previous_weight_kg: pr.previousWeightKg,
      achieved_at: achievedAt.toISOString(),
    }),
  );
}

export async function getSessionTotals(userId: string, sessionId: string) {
  return recomputeSession(userId, sessionId);
}

// ---------- rekap & setara ----------

export async function setCompareItem(userId: string, sessionId: string, itemId: string | null) {
  run(
    await db()
      .from("workout_sessions")
      .update({ compare_item: itemId })
      .eq("id", sessionId)
      .eq("user_id", userId),
  );
}

// benda setara di rekap sebelumnya (selain sesi ini)
export async function previousCompareItem(userId: string, exceptSessionId: string): Promise<string | null> {
  const row = maybe(
    await db()
      .from("workout_sessions")
      .select("compare_item")
      .eq("user_id", userId)
      .neq("id", exceptSessionId)
      .is("deleted_at", null)
      .not("compare_item", "is", null)
      .order("ended_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ compare_item: string }>(),
  );
  return row?.compare_item ?? null;
}

export async function lastClosedSession(userId: string) {
  const row = maybe(
    await db()
      .from("workout_sessions")
      .select("id, total_volume, compare_item")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .is("deleted_at", null)
      .order("ended_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; total_volume: number; compare_item: string | null }>(),
  );
  return row && { id: row.id, totalVolume: Number(row.total_volume), compareItem: row.compare_item };
}

// volume sesi selesai terakhir dengan split yang sama (pembanding di rekap); null kalau belum ada
export async function previousSplitVolume(userId: string, split: string | null, exceptSessionId: string) {
  if (!split) return null;
  const row = maybe(
    await db()
      .from("workout_sessions")
      .select("total_volume")
      .eq("user_id", userId)
      .eq("split", split)
      .neq("id", exceptSessionId)
      .gt("set_count", 0)
      .not("ended_at", "is", null)
      .is("deleted_at", null)
      .order("ended_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ total_volume: number }>(),
  );
  return row ? Number(row.total_volume) : null;
}

// jumlah latihan yang pecah rekor di sesi ini
export async function sessionPrCount(userId: string, sessionId: string): Promise<number> {
  const rows = must(
    await db()
      .from("personal_records")
      .select("exercise_id, sets!inner(session_id)")
      .eq("user_id", userId)
      .eq("sets.session_id", sessionId),
  ) as { exercise_id: number }[];
  return new Set(rows.map((r) => r.exercise_id)).size;
}

// sesi senin–minggu minggu berjalan
export async function weekSummary(userId: string, timeZone: string, now: Date) {
  const monday = weekStart(localDate(now, timeZone));
  const since = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const rows = must(
    await db()
      .from("workout_sessions")
      .select("started_at, total_volume")
      .eq("user_id", userId)
      .gt("set_count", 0)
      .is("deleted_at", null)
      .gte("started_at", since)
      .returns<{ started_at: string; total_volume: number }[]>(),
  );
  const thisWeek = rows.filter((r) => localDate(new Date(r.started_at), timeZone) >= monday);
  return {
    sessions: thisWeek.length,
    volume: thisWeek.reduce((sum, r) => sum + Number(r.total_volume), 0),
  };
}

// sesi hari ini (belum dihapus) + setnya, untuk /hapus
export async function todaysSessions(userId: string, timeZone: string, now: Date) {
  const today = localDate(now, timeZone);
  type Row = {
    id: string;
    split: string | null;
    started_at: string;
    total_volume: number;
    set_count: number;
    sets: {
      id: string;
      set_order: number;
      weight_kg: number | null;
      is_added: boolean;
      reps: number | null;
      duration_sec: number | null;
      distance_m: number | null;
      deleted_at: string | null;
      created_at: string;
      exercises: { name: string } | null;
    }[];
  };
  const rows = must(
    await db()
      .from("workout_sessions")
      .select(
        "id, split, started_at, total_volume, set_count, sets(id, set_order, weight_kg, is_added, reps, duration_sec, distance_m, deleted_at, created_at, exercises(name))",
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("started_at", new Date(now.getTime() - 2 * 86_400_000).toISOString())
      .order("started_at")
      .returns<Row[]>(),
  );
  return rows
    .filter((r) => localDate(new Date(r.started_at), timeZone) === today)
    .map((r) => ({
      id: r.id,
      split: r.split,
      startedAt: new Date(r.started_at),
      volume: Number(r.total_volume),
      setCount: r.set_count,
      sets: r.sets
        .filter((x) => x.deleted_at === null)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((x) => ({
          id: x.id,
          order: x.set_order,
          name: x.exercises?.name ?? "?",
          weightKg: x.weight_kg === null ? null : Number(x.weight_kg),
          isAdded: x.is_added,
          reps: x.reps,
          durationSec: x.duration_sec,
          distanceM: x.distance_m,
        })),
    }));
}

// ---------- status hari ----------

export async function setDayStatus(userId: string, day: string, status: DayStatus, reason: string | null = null) {
  run(await db().from("day_status").upsert({ user_id: userId, day, status, reason }, { onConflict: "user_id,day" }));
}

// ---------- ingatan percakapan (bot_state) ----------

export type Awaiting = "nama";

// angka di kartu aktif (SPEC §5.10). disimpan di bot_state.draft, jadi data tombol tidak membawa angka.
// tanpa angka (latihan belum pernah dicatat): reps & duration_sec null.
export type CardDraft = {
  exercise_id: number;
  session_id: string;
  set_order: number;
  weight_kg: number | null;
  reps: number | null;
  duration_sec: number | null;
  distance_m: number | null;
  is_added: boolean;
};

export const draftSet = (d: CardDraft): CardSet | null =>
  d.reps === null && d.duration_sec === null
    ? null
    : { weightKg: d.weight_kg, isAdded: d.is_added, reps: d.reps, durationSec: d.duration_sec, distanceM: d.distance_m };

export const toDraft = (exerciseId: number, sessionId: string, setOrder: number, s: CardSet | null): CardDraft => ({
  exercise_id: exerciseId,
  session_id: sessionId,
  set_order: setOrder,
  weight_kg: s?.weightKg ?? null,
  reps: s?.reps ?? null,
  duration_sec: s?.durationSec ?? null,
  distance_m: s?.distanceM ?? null,
  is_added: s?.isAdded ?? false,
});

// latihan coba: kartu contoh yang tidak disimpan ke sets
export type Practice = { step: 1 | 2 | 3; messageId: number | null; draft: CardSet; logged: CardSet[] };

export type BotState = {
  focusExerciseId: number | null;
  awaiting: Awaiting | null;
  awaitingData: Record<string, unknown>;
  backdate: boolean;
  cardMessageId: number | null;
  draft: CardDraft | null;
  skippedExerciseIds: number[]; // latihan yang dilewati di sesi ini
  lastDeletedSetId: string | null; // untuk [↩️ urungkan]
  compactMessages: Record<string, number>; // baris padat per latihan di sesi ini
  practice: Practice | null;
  sessionsDone: number; // sesi nyata yang sudah selesai (baris 💡 hanya di 3 sesi pertama)
  menuVersion: number;
  updatedAt: Date;
};

const STATE_COLUMNS =
  "focus_exercise_id, awaiting, awaiting_data, backdate, card_message_id, draft, skipped_exercise_ids, last_deleted_set_id, compact_messages, practice, sessions_done, menu_version, updated_at";

export async function getState(userId: string): Promise<BotState> {
  type Row = {
    focus_exercise_id: number | null;
    awaiting: Awaiting | null;
    awaiting_data: Record<string, unknown>;
    backdate: boolean;
    card_message_id: number | null;
    draft: CardDraft | null;
    skipped_exercise_ids: number[] | null;
    last_deleted_set_id: string | null;
    compact_messages: Record<string, number> | null;
    practice: Practice | null;
    sessions_done: number;
    menu_version: number;
    updated_at: string;
  };
  const row = maybe(await db().from("bot_state").select(STATE_COLUMNS).eq("user_id", userId).maybeSingle<Row>());
  return {
    focusExerciseId: row?.focus_exercise_id ?? null,
    awaiting: row?.awaiting ?? null,
    awaitingData: row?.awaiting_data ?? {},
    backdate: row?.backdate ?? false,
    cardMessageId: row?.card_message_id === null || row?.card_message_id === undefined ? null : Number(row.card_message_id),
    // draft dari versi bot lama (camelCase, tanpa session_id) dianggap tidak ada
    draft: row?.draft?.session_id && row.draft.exercise_id ? row.draft : null,
    skippedExerciseIds: row?.skipped_exercise_ids ?? [],
    lastDeletedSetId: row?.last_deleted_set_id ?? null,
    compactMessages: row?.compact_messages ?? {},
    practice: row?.practice ?? null,
    sessionsDone: row?.sessions_done ?? 0,
    menuVersion: row?.menu_version ?? 0,
    updatedAt: new Date(row?.updated_at ?? 0),
  };
}

type Patch = Partial<Omit<BotState, "updatedAt">>;
const COLUMN: Record<keyof Patch, string> = {
  focusExerciseId: "focus_exercise_id",
  awaiting: "awaiting",
  awaitingData: "awaiting_data",
  backdate: "backdate",
  cardMessageId: "card_message_id",
  draft: "draft",
  skippedExerciseIds: "skipped_exercise_ids",
  lastDeletedSetId: "last_deleted_set_id",
  compactMessages: "compact_messages",
  practice: "practice",
  sessionsDone: "sessions_done",
  menuVersion: "menu_version",
};

export async function setState(userId: string, patch: Patch) {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(patch)) row[COLUMN[key as keyof Patch]] = value;
  run(await db().from("bot_state").upsert(row, { onConflict: "user_id" }));
}

// kartu, baris padat, dan latihan yang dilewati berlaku per sesi
export const CARD_RESET: Patch = {
  cardMessageId: null,
  draft: null,
  skippedExerciseIds: [],
  lastDeletedSetId: null,
  compactMessages: {},
};

// ---------- tombol sekali pakai & pesan terjadwal ----------

// true kalau tombol di pesan ini baru pertama kali dipakai
export async function claimButton(chatId: number, messageId: number): Promise<boolean> {
  const { error } = await db().from("used_buttons").insert({ chat_id: chatId, message_id: messageId });
  if (isUniqueViolation(error)) return false;
  run({ error });
  return true;
}

// tombol gagal diproses (error di tengah jalan): boleh ditekan lagi
export async function releaseButton(chatId: number, messageId: number) {
  run(await db().from("used_buttons").delete().eq("chat_id", chatId).eq("message_id", messageId));
}

// penanda tombol lama tidak perlu disimpan selamanya (pesan setua itu jarang ditekan lagi)
export async function cleanupButtons(olderThanDays = 30) {
  const before = new Date(Date.now() - olderThanDays * 86_400_000).toISOString();
  run(await db().from("used_buttons").delete().lt("used_at", before));
}

// true kalau pesan terjadwal ini belum pernah ditandai untuk hari itu
export async function markDaily(userId: string, day: string, kind: "pengingat" | "kelewat" | "rekap_mingguan") {
  const { error } = await db().from("bot_daily").insert({ user_id: userId, day, kind });
  if (isUniqueViolation(error)) return false;
  run({ error });
  return true;
}
