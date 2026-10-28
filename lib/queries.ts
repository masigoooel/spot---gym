// query baca yang dipakai bot dan dashboard web. semua difilter user_id,
// dan daftar panjang diambil per halaman (lihat all() di lib/db.ts).

import { all, db, must } from "@/lib/db";
import type { Unit } from "@/lib/format";
import type { ExerciseKind } from "@/lib/parser";
import { findItem, pickSetara, type Setara } from "@/lib/setara";
import {
  addDays,
  localDate,
  successfulReps,
  type DayStatus,
  type SplitSchedule,
  type StreakInput,
} from "@/lib/workout";

// ---------- pengaturan ----------

export type Program = "ppl" | "upper_lower" | "ppl_ul" | "full_body" | "bebas";
export type Chattiness = "aktif" | "seperlunya";

export type Settings = {
  telegramId: number;
  deleteRequestedAt: Date | null;
  displayName: string | null;
  username: string | null;
  joinedAt: Date;
  timezone: string;
  unit: Unit;
  program: Program;
  splitSchedule: SplitSchedule;
  weeklyTarget: number;
  restAllowance: number;
  reminderTime: string; // `17:00`
  chattiness: Chattiness;
  compareMode: "auto" | "lock";
  compareItem: string;
  notifyPr: boolean;
  notifyWeekly: boolean;
  notifySchedule: boolean;
  autoStory: boolean;
};

const SETTINGS_COLUMNS =
  "unit, program, split_schedule, weekly_target, rest_allowance, reminder_time, chattiness, compare_mode, compare_item, notify_pr, notify_weekly, notify_schedule, auto_story";

type SettingsRaw = {
  unit: Unit;
  program: Program;
  split_schedule: SplitSchedule;
  weekly_target: number;
  rest_allowance: number;
  reminder_time: string;
  chattiness: Chattiness;
  compare_mode: "auto" | "lock";
  compare_item: string;
  notify_pr: boolean;
  notify_weekly: boolean;
  notify_schedule: boolean;
  auto_story: boolean;
};

type UserRaw = {
  id: string;
  telegram_id: number;
  delete_requested_at: string | null;
  display_name: string | null;
  username: string | null;
  created_at: string;
  timezone: string;
  user_settings: SettingsRaw | null;
};

export const USER_WITH_SETTINGS = `id, telegram_id, delete_requested_at, display_name, username, created_at, timezone, user_settings(${SETTINGS_COLUMNS})`;

// baris users + user_settings → Settings (nilai bawaan kalau user_settings belum ada)
export function toSettings(row: UserRaw): Settings {
  const s = row.user_settings;
  return {
    telegramId: row.telegram_id,
    deleteRequestedAt: row.delete_requested_at ? new Date(row.delete_requested_at) : null,
    displayName: row.display_name,
    username: row.username,
    joinedAt: new Date(row.created_at),
    timezone: row.timezone,
    unit: s?.unit ?? "kg",
    program: s?.program ?? "ppl",
    splitSchedule: s?.split_schedule ?? {},
    weeklyTarget: s?.weekly_target ?? 5,
    restAllowance: s?.rest_allowance ?? 1,
    reminderTime: (s?.reminder_time ?? "17:00").slice(0, 5),
    chattiness: s?.chattiness ?? "aktif",
    compareMode: s?.compare_mode ?? "auto",
    compareItem: s?.compare_item ?? "mobil",
    notifyPr: s?.notify_pr ?? true,
    notifyWeekly: s?.notify_weekly ?? true,
    notifySchedule: s?.notify_schedule ?? true,
    autoStory: s?.auto_story ?? true,
  };
}

export type UserRow = UserRaw;

export async function getSettings(userId: string): Promise<Settings> {
  return toSettings(must(await db().from("users").select(USER_WITH_SETTINGS).eq("id", userId).single<UserRaw>()));
}

// ---------- status hari ----------

// libur / geser / kelewat per tanggal lokal
export async function getDayStatuses(userId: string, opts: { since?: string } = {}): Promise<Record<string, DayStatus>> {
  const rows = await all<{ day: string; status: DayStatus }>((from, to) => {
    let q = db().from("day_status").select("day, status").eq("user_id", userId).order("day");
    if (opts.since) q = q.gte("day", opts.since);
    return q.range(from, to);
  });
  return Object.fromEntries(rows.map((r) => [r.day, r.status]));
}

// semua bahan hitung streak untuk satu user
export async function getStreakInput(userId: string, settings: Settings, today: string): Promise<StreakInput> {
  const [dates, statuses] = await Promise.all([sessionDates(userId, settings.timezone), getDayStatuses(userId)]);
  return {
    sessionDates: dates,
    statuses,
    schedule: settings.splitSchedule,
    restAllowance: settings.restAllowance,
    today,
  };
}

// status minggu berjalan saja, untuk rencana minggu (/geser)
export async function getWeekStatuses(userId: string, monday: string) {
  const all = await getDayStatuses(userId, { since: monday });
  return Object.fromEntries(Object.entries(all).filter(([d]) => d < addDays(monday, 7)));
}

// ---------- sesi ----------

export type SessionRow = {
  id: string;
  split: string | null;
  startedAt: Date;
  endedAt: Date | null;
  volume: number;
  setCount: number;
  compareItem: string | null;
  date: string; // tanggal lokal user
};

const SESSION_COLUMNS = "id, split, started_at, ended_at, total_volume, set_count, compare_item";
type RawSession = {
  id: string;
  split: string | null;
  started_at: string;
  ended_at: string | null;
  total_volume: number;
  set_count: number;
  compare_item: string | null;
};

function toSession(r: RawSession, timeZone: string): SessionRow {
  const startedAt = new Date(r.started_at);
  return {
    id: r.id,
    split: r.split,
    startedAt,
    endedAt: r.ended_at ? new Date(r.ended_at) : null,
    volume: Number(r.total_volume),
    setCount: r.set_count,
    compareItem: r.compare_item,
    date: localDate(startedAt, timeZone),
  };
}

// sesi yang berisi set, terbaru dulu
export async function getSessions(
  userId: string,
  timeZone: string,
  opts: { since?: Date; until?: Date; limit?: number } = {},
): Promise<SessionRow[]> {
  const query = (from: number, to: number) => {
    let q = db()
      .from("workout_sessions")
      .select(SESSION_COLUMNS)
      .eq("user_id", userId)
      .gt("set_count", 0)
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .order("id");
    if (opts.since) q = q.gte("started_at", opts.since.toISOString());
    if (opts.until) q = q.lt("started_at", opts.until.toISOString());
    return q.range(from, to).returns<RawSession[]>();
  };
  const rows = opts.limit !== undefined ? must(await query(0, opts.limit - 1)) : await all(query);
  return rows.map((r) => toSession(r, timeZone));
}

export async function getWorkoutSession(
  userId: string,
  sessionId: string,
  timeZone: string,
  { includeDeleted = false } = {},
): Promise<SessionRow | null> {
  let q = db().from("workout_sessions").select(SESSION_COLUMNS).eq("user_id", userId).eq("id", sessionId);
  if (!includeDeleted) q = q.is("deleted_at", null);
  const { data, error } = await q.maybeSingle<RawSession>();
  if (error) {
    // id yang bukan uuid ditolak postgres; anggap saja tidak ada
    if (error.code === "22P02") return null;
    throw new Error(error.message);
  }
  return data ? toSession(data, timeZone) : null;
}

// benda setara yang tersimpan di sesi, atau dipilih sekarang (stabil, tanpa acak)
export function sessionSetara(s: SessionRow, settings: Settings): Setara | null {
  const saved = s.compareItem ? findItem(s.compareItem) : null;
  if (saved && s.volume > 0) return { item: saved, count: s.volume / saved.kg };
  return pickSetara(s.volume, {
    mode: settings.compareMode,
    lockedId: settings.compareItem,
    random: () => 0,
  });
}

export function durationMinutes(s: SessionRow): number | null {
  if (!s.endedAt) return null;
  return Math.max(1, Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60_000));
}

// tanggal lokal semua sesi yang berisi set, untuk streak
export async function sessionDates(userId: string, timeZone: string): Promise<string[]> {
  const rows = await all<{ started_at: string }>((from, to) =>
    db()
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .gt("set_count", 0)
      .is("deleted_at", null)
      .order("started_at")
      .range(from, to),
  );
  return [...new Set(rows.map((r) => localDate(new Date(r.started_at), timeZone)))];
}

// ---------- set ----------

export type LoggedSet = {
  id: string;
  sessionId: string;
  exerciseId: number;
  name: string;
  slug: string;
  weightKg: number | null;
  isAdded: boolean;
  reps: number | null; // null untuk durasi/kardio
  durationSec: number | null;
  distanceM: number | null;
  kind: ExerciseKind;
  failed: boolean;
  isDrop: boolean;
  order: number;
  at: Date;
  date: string;
};

type RawSet = {
  id: string;
  session_id: string;
  exercise_id: number;
  weight_kg: number | null;
  is_added: boolean;
  reps: number | null;
  duration_sec: number | null;
  distance_m: number | null;
  failed: boolean;
  is_drop: boolean;
  set_order: number;
  created_at: string;
  exercises: { name: string; slug: string; kind: ExerciseKind } | null;
};

// set terlama dulu
export async function getSets(
  userId: string,
  timeZone: string,
  opts: { since?: Date; sessionIds?: string[]; exerciseId?: number; weightedOnly?: boolean } = {},
): Promise<LoggedSet[]> {
  if (opts.sessionIds && opts.sessionIds.length === 0) return [];
  const rows = await all<RawSet>((from, to) => {
    let q = db()
      .from("sets")
      .select(
        "id, session_id, exercise_id, weight_kg, is_added, reps, duration_sec, distance_m, failed, is_drop, set_order, created_at, exercises(name, slug, kind)",
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at")
      .order("id");
    if (opts.since) q = q.gte("created_at", opts.since.toISOString());
    if (opts.sessionIds) q = q.in("session_id", opts.sessionIds);
    if (opts.exerciseId !== undefined) q = q.eq("exercise_id", opts.exerciseId);
    if (opts.weightedOnly) q = q.not("weight_kg", "is", null);
    return q.range(from, to).returns<RawSet[]>();
  });
  return rows.map((r) => {
    const at = new Date(r.created_at);
    return {
      id: r.id,
      sessionId: r.session_id,
      exerciseId: r.exercise_id,
      name: r.exercises?.name ?? "?",
      slug: r.exercises?.slug ?? "",
      weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
      isAdded: r.is_added,
      isDrop: r.is_drop,
      reps: r.reps,
      durationSec: r.duration_sec,
      distanceM: r.distance_m,
      kind: r.exercises?.kind ?? "beban",
      failed: r.failed,
      order: r.set_order,
      at,
      date: localDate(at, timeZone),
    };
  });
}

export type BestSet = {
  exerciseId: number;
  name: string;
  slug: string;
  weightKg: number;
  isAdded: boolean;
  reps: number;
  at: Date;
};

// set terberat per latihan (tie: rep terbanyak), terbaru dulu. untuk /pr dan dashboard.
export async function bestSets(userId: string, exerciseId?: number): Promise<BestSet[]> {
  const rows = await getSets(userId, "UTC", { exerciseId, weightedOnly: true });
  const best = new Map<number, BestSet>();
  for (const r of rows) {
    const reps = successfulReps(r);
    if (r.weightKg === null || reps < 1) continue;
    const current = best.get(r.exerciseId);
    if (
      !current ||
      r.weightKg > current.weightKg ||
      (r.weightKg === current.weightKg && reps > current.reps)
    ) {
      best.set(r.exerciseId, {
        exerciseId: r.exerciseId,
        name: r.name,
        slug: r.slug,
        weightKg: r.weightKg,
        isAdded: r.isAdded,
        reps,
        at: r.at,
      });
    }
  }
  return [...best.values()].sort((a, b) => b.at.getTime() - a.at.getTime());
}

// ---------- personal record ----------

export type PrRow = {
  id: string;
  setId: string;
  sessionId: string | null;
  exerciseId: number;
  name: string;
  slug: string;
  weightKg: number;
  reps: number;
  e1rm: number | null;
  previousWeightKg: number | null;
  at: Date;
  date: string;
};

// terbaru dulu
export async function getPrs(
  userId: string,
  timeZone: string,
  opts: { exerciseId?: number; setIds?: string[] } = {},
): Promise<PrRow[]> {
  if (opts.setIds && opts.setIds.length === 0) return [];
  type Raw = {
    id: string;
    set_id: string;
    exercise_id: number;
    weight_kg: number;
    reps: number;
    e1rm: number | null;
    previous_weight_kg: number | null;
    achieved_at: string;
    exercises: { name: string; slug: string } | null;
    sets: { session_id: string } | null;
  };
  const rows = await all<Raw>((from, to) => {
    let q = db()
      .from("personal_records")
      .select(
        "id, set_id, exercise_id, weight_kg, reps, e1rm, previous_weight_kg, achieved_at, exercises(name, slug), sets(session_id)",
      )
      .eq("user_id", userId)
      .order("achieved_at", { ascending: false })
      .order("id");
    if (opts.exerciseId !== undefined) q = q.eq("exercise_id", opts.exerciseId);
    if (opts.setIds) q = q.in("set_id", opts.setIds);
    return q.range(from, to).returns<Raw[]>();
  });
  return rows.map((r) => {
    const at = new Date(r.achieved_at);
    return {
      id: r.id,
      setId: r.set_id,
      sessionId: r.sets?.session_id ?? null,
      exerciseId: r.exercise_id,
      name: r.exercises?.name ?? "?",
      slug: r.exercises?.slug ?? "",
      weightKg: Number(r.weight_kg),
      reps: r.reps,
      e1rm: r.e1rm === null ? null : Number(r.e1rm),
      previousWeightKg: r.previous_weight_kg === null ? null : Number(r.previous_weight_kg),
      at,
      date: localDate(at, timeZone),
    };
  });
}
