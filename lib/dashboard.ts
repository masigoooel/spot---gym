// data siap-tampil untuk halaman dashboard. setiap fungsi menerima user id dari
// getCurrentUser(), jadi tidak pernah membaca data user lain.
import "server-only";
import { connection } from "next/server";
import { all, db } from "@/lib/db";
import { formatDay, formatDayLong, formatDayShort, formatMonthYear, formatSetChip, toUnit } from "@/lib/format";
import { sessionDeleteImpact, setDeleteImpact } from "@/lib/hapus";
import {
  bestSets,
  durationMinutes,
  getPrs,
  getSessions,
  getSets,
  getSettings,
  getStreakInput,
  getWeekStatuses,
  getWorkoutSession,
  sessionSetara,
  type LoggedSet,
  type SessionRow,
  type Settings,
} from "@/lib/queries";
import type { SettingsRow } from "@/lib/settings";
import { itemsInRange } from "@/lib/setara";
import {
  daysBetween,
  heatmap,
  lastWeeks,
  neglectedSplit,
  percentChange,
  repRecords,
  weeklyMax,
} from "@/lib/stats";
import {
  PROGRAM_SPLITS,
  addDays,
  localDate,
  longestStreak,
  plannedSplit,
  setVolume,
  streakDays,
  successfulReps,
  weekStart,
} from "@/lib/workout";

// batas bawah query untuk tanggal lokal; mundur sehari supaya aman dari selisih zona waktu
function sinceLocal(ymd: string): Date {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) - 86_400_000);
}

// label minggu `12 okt` dari `YYYY-MM-DD`
const weekLabel = (ymd: string) => formatDay(new Date(`${ymd}T12:00:00Z`), "UTC");

export const displayName = (s: Pick<Settings, "displayName" | "username">) =>
  s.displayName || s.username || "kamu";

// nama latihan unik dalam urutan pertama kali muncul
function exerciseNames(sets: LoggedSet[]): string[] {
  return [...new Set(sets.map((s) => s.name))];
}

// ---------- ringkasan ----------

export async function getRingkasan(userId: string) {
  await connection(); // "hari ini" dihitung saat request, bukan saat prerender
  const now = new Date();
  const settings = await getSettings(userId);
  const tz = settings.timezone;
  const today = localDate(now, tz);
  const weeks12 = lastWeeks(today, 12);
  const weeks8 = weeks12.slice(-8);

  const [streakInput, recent, latest, chartSets, prs, best, weekStatuses] = await Promise.all([
    getStreakInput(userId, settings, today),
    getSessions(userId, tz, { since: sinceLocal(weeks12[0]) }),
    getSessions(userId, tz, { limit: 3 }),
    getSets(userId, tz, { since: sinceLocal(weeks8[0]), weightedOnly: true }),
    getPrs(userId, tz),
    bestSets(userId),
    getWeekStatuses(userId, weekStart(today)),
  ]);
  const latestSets = await getSets(userId, tz, { sessionIds: latest.map((s) => s.id) });

  // minggu ini vs minggu lalu sampai hari yang sama (biar senin tidak kalah telak dari seminggu penuh)
  const monday = weekStart(today);
  const prevMonday = addDays(monday, -7);
  const volumeOf = (xs: SessionRow[]) => xs.reduce((sum, s) => sum + s.volume, 0);
  const thisWeek = recent.filter((s) => s.date >= monday);
  const lastWeek = recent.filter((s) => s.date >= prevMonday && s.date <= addDays(today, -7));

  const prsThisMonth = prs.filter((p) => p.date.slice(0, 7) === today.slice(0, 7));

  // grafik: 4 latihan berbeban yang paling sering dilatih 8 minggu terakhir
  const byExercise = new Map<number, { slug: string; name: string; sessions: Set<string>; points: { date: string; kg: number }[] }>();
  for (const s of chartSets) {
    if (s.weightKg === null || s.isAdded) continue;
    const e = byExercise.get(s.exerciseId) ?? { slug: s.slug, name: s.name, sessions: new Set(), points: [] };
    e.sessions.add(s.sessionId);
    e.points.push({ date: s.date, kg: s.weightKg });
    byExercise.set(s.exerciseId, e);
  }
  const chartExercises = [...byExercise.values()]
    .sort((a, b) => b.sessions.size - a.sessions.size)
    .slice(0, 4)
    .map((e) => ({ slug: e.slug, name: e.name, values: weeklyMax(e.points, weeks8) }));

  const last = latest[0] ?? null;
  const lastPr = last
    ? prs.filter((p) => p.sessionId === last.id).sort((a, b) => b.weightKg - a.weightKg)[0]
    : undefined;

  return {
    unit: settings.unit,
    name: displayName(settings),
    dateLabel: formatDayLong(now, tz),
    todaySplit: plannedSplit(today, settings.splitSchedule, weekStatuses),
    todayStatus: weekStatuses[today] ?? null,
    streak: streakDays(streakInput),
    longestStreak: longestStreak(streakInput),
    week: {
      sessions: thisWeek.length,
      target: settings.weeklyTarget,
      volume: volumeOf(thisWeek),
      change: percentChange(volumeOf(thisWeek), volumeOf(lastWeek)),
    },
    prMonth: {
      count: prsThisMonth.length,
      latest: prsThisMonth[0] ? { name: prsThisMonth[0].name, weightKg: prsThisMonth[0].weightKg } : null,
    },
    lastSession: last && {
      id: last.id,
      split: last.split,
      weekday: formatDayLong(last.startedAt, tz).split(",")[0],
      open: last.endedAt === null,
      volume: last.volume,
      setCount: last.setCount,
      minutes: durationMinutes(last),
      setara: sessionSetara(last, settings),
      canChangeSetara: itemsInRange(last.volume).length > 1,
      pr: lastPr ? { name: lastPr.name, weightKg: lastPr.weightKg } : null,
    },
    prList: best.slice(0, 4).map((b) => ({
      name: b.name,
      weightKg: b.weightKg,
      isAdded: b.isAdded,
      reps: b.reps,
      dateLabel: formatDay(b.at, tz),
      isNew: prs.some((p) => p.exerciseId === b.exerciseId && daysBetween(p.date, today) <= 7),
    })),
    chart: { weeks: weeks8.map(weekLabel), exercises: chartExercises },
    heat: {
      cells: heatmap(
        recent.map((s) => ({ date: s.date, volume: s.volume })),
        today,
        12,
      ).map((c) => ({ ...c, label: formatDayShort(new Date(`${c.date}T12:00:00Z`), "UTC") })),
      sessions: recent.length,
    },
    neglected: neglectedSplit(
      recent.map((s) => ({ split: s.split, date: s.date })),
      settings.splitSchedule,
      today,
    ),
    recent: latest.map((s) => ({
      id: s.id,
      dateLabel: formatDayShort(s.startedAt, tz),
      split: s.split,
      exercises: exerciseNames(latestSets.filter((x) => x.sessionId === s.id)),
      setCount: s.setCount,
      volume: s.volume,
    })),
    botUsername: process.env.NEXT_PUBLIC_BOT_USERNAME ?? null,
  };
}

export type Ringkasan = Awaited<ReturnType<typeof getRingkasan>>;

// ---------- progres ----------

export const RANGES = {
  "1bln": { weeks: 5, label: "1 bln", gain: "naik 1 bulan" },
  "8mgg": { weeks: 8, label: "8 mgg", gain: "naik 8 minggu" },
  "1thn": { weeks: 52, label: "1 thn", gain: "naik 1 tahun" },
} as const;
export type RangeKey = keyof typeof RANGES;

const isRange = (v: string | undefined): v is RangeKey => v !== undefined && v in RANGES;

// rangkuman set satu latihan dalam satu sesi: `72,5 × 5 · 72,5 × 5`
function sessionGroups(sets: LoggedSet[]) {
  const bySession = new Map<string, LoggedSet[]>();
  for (const s of sets) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s]);
  return [...bySession.values()].sort((a, b) => b[0].at.getTime() - a[0].at.getTime());
}

export async function getProgres(userId: string, slugParam?: string, rangeParam?: string) {
  await connection();
  const now = new Date();
  const settings = await getSettings(userId);
  const tz = settings.timezone;
  const today = localDate(now, tz);
  const range: RangeKey = isRange(rangeParam) ? rangeParam : "8mgg";
  const weeks = lastWeeks(today, RANGES[range].weeks);

  const sets = await getSets(userId, tz, { weightedOnly: true });

  // per latihan, yang terakhir dilatih paling atas
  const byExercise = new Map<string, LoggedSet[]>();
  for (const s of sets) {
    if (successfulReps(s) < 1) continue;
    byExercise.set(s.slug, [...(byExercise.get(s.slug) ?? []), s]);
  }
  const exercises = [...byExercise.entries()]
    .map(([slug, xs]) => {
      const values = weeklyMax(
        xs.map((s) => ({ date: s.date, kg: s.weightKg! })),
        weeks,
      );
      const defined = values.filter((v): v is number => v !== null);
      const top = xs.reduce((a, b) =>
        b.weightKg! > a.weightKg! || (b.weightKg === a.weightKg && (b.reps ?? 0) > (a.reps ?? 0)) ? b : a,
      );
      return {
        slug,
        name: xs[0].name,
        sets: xs,
        values,
        top,
        gain: defined.length > 1 ? defined[defined.length - 1] - defined[0] : null,
        lastAt: xs[xs.length - 1].at.getTime(),
      };
    })
    .sort((a, b) => b.lastAt - a.lastAt);

  // bawaan: latihan yang paling sering dilatih di rentang ini; kalau seri, yang bebannya terberat
  const sessionsIn = (xs: LoggedSet[]) => new Set(xs.filter((s) => s.date >= weeks[0]).map((s) => s.sessionId)).size;
  const selected =
    exercises.find((e) => e.slug === slugParam) ??
    [...exercises].sort(
      (a, b) => sessionsIn(b.sets) - sessionsIn(a.sets) || b.top.weightKg! - a.top.weightKg!,
    )[0] ??
    null;

  let detail = null;
  if (selected) {
    // frekuensi dibagi minggu sejak pertama latihan (kalau lebih pendek dari rentangnya)
    const firstWeek = weekStart(selected.sets[0].date);
    const weeksActive = weeks.filter((w) => w >= firstWeek).length;
    detail = {
      slug: selected.slug,
      name: selected.name,
      top: { weightKg: selected.top.weightKg!, reps: successfulReps(selected.top), isAdded: selected.top.isAdded },
      // perkiraan 1rm tidak bermakna untuk beban tambahan (berat badan tidak tercatat)
      e1rm: selected.top.isAdded ? null : repRecords(selected.sets).bestE1rm,
      gain: selected.gain,
      perWeek: sessionsIn(selected.sets) / Math.max(1, weeksActive),
      values: selected.values,
      recent: sessionGroups(selected.sets)
        .slice(0, 3)
        .map((group) => ({
          sessionId: group[0].sessionId,
          dateLabel: formatDayShort(group[0].at, tz),
          sets: group.map((s) => formatSetChip(s, settings.unit)),
          volume: group.reduce((sum, s) => sum + setVolume(s), 0),
        })),
    };
  }

  return {
    unit: settings.unit,
    range,
    weeks: weeks.map(weekLabel),
    list: exercises.map((e) => ({
      slug: e.slug,
      name: e.name,
      topKg: e.top.weightKg!,
      isAdded: e.top.isAdded,
      gain: e.gain,
    })),
    detail,
  };
}

// ---------- riwayat ----------

// `19–25 okt` atau `28 sep – 4 okt`
function weekRange(monday: string): string {
  const sunday = addDays(monday, 6);
  const a = weekLabel(monday).split(" ");
  const b = weekLabel(sunday).split(" ");
  return a[1] === b[1] ? `${a[0]}–${b[0]} ${b[1]}` : `${a.join(" ")} – ${b.join(" ")}`;
}

export async function getRiwayat(userId: string, selectedId?: string, weeksParam?: string) {
  await connection();
  const now = new Date();
  const settings = await getSettings(userId);
  const tz = settings.timezone;
  const today = localDate(now, tz);

  // tampil per 12 minggu; "lihat lebih lama" menambah 12 minggu lagi
  const shown = Math.min(520, Math.max(12, Math.ceil((Number(weeksParam) || 12) / 12) * 12));
  const weeks = lastWeeks(today, shown);
  const since = sinceLocal(weeks[0]);

  const [sessions, older] = await Promise.all([
    getSessions(userId, tz, { since }),
    getSessions(userId, tz, { until: since, limit: 1 }),
  ]);

  const selected = selectedId ? await getWorkoutSession(userId, selectedId, tz) : (sessions[0] ?? null);
  if (selectedId && !selected) return null; // bukan milik user ini, atau tidak ada

  const sets = selected ? await getSets(userId, tz, { sessionIds: [selected.id] }) : [];
  const prSetIds = new Set((await getPrs(userId, tz, { setIds: sets.map((s) => s.id) })).map((p) => p.setId));

  // akibat hapus (untuk kalimat konfirmasi): pr yang berlaku sekarang dan jadi berapa kalau dihapus
  const setImpact = new Map<string, number | null>();
  for (const s of sets.filter((x) => prSetIds.has(x.id))) {
    const info = { ...s, sessionId: s.sessionId, exerciseName: s.name, deleted: false };
    const impact = await setDeleteImpact(userId, info);
    if (impact.isPr) setImpact.set(s.id, impact.prAfterKg);
  }
  const sessionImpact = selected ? await sessionDeleteImpact(userId, selected.id, sets, prSetIds) : [];

  const thisMonday = weekStart(today);
  const groups = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const w = weekStart(s.date);
    groups.set(w, [...(groups.get(w) ?? []), s]);
  }

  const exercises = new Map<string, LoggedSet[]>();
  for (const s of sets) exercises.set(s.name, [...(exercises.get(s.name) ?? []), s]);

  return {
    unit: settings.unit,
    shownWeeks: shown,
    hasOlder: older.length > 0,
    weeks: [...groups.entries()].map(([monday, items]) => ({
      label:
        monday === thisMonday
          ? `minggu ini · ${weekRange(monday)}`
          : monday === addDays(thisMonday, -7)
            ? `minggu lalu · ${weekRange(monday)}`
            : weekRange(monday),
      volume: items.reduce((sum, s) => sum + s.volume, 0),
      items: items.map((s) => ({
        id: s.id,
        dateLabel: formatDayShort(s.startedAt, tz),
        split: s.split,
        volume: s.volume,
        setCount: s.setCount,
        minutes: durationMinutes(s),
      })),
    })),
    detail: selected && {
      id: selected.id,
      dateLabel: formatDayLong(selected.startedAt, tz),
      split: selected.split,
      volume: selected.volume,
      setCount: selected.setCount,
      minutes: durationMinutes(selected),
      setara: sessionSetara(selected, settings),
      prLost: sessionImpact,
      exercises: [...exercises.entries()].map(([name, xs]) => ({
        name,
        sets: xs.map((s) => ({
          id: s.id,
          order: s.order,
          chip: formatSetChip(s, settings.unit),
          kind: s.kind,
          weight: s.weightKg === null ? null : toUnit(s.weightKg, settings.unit),
          isAdded: s.isAdded,
          reps: s.reps,
          failed: s.failed,
          durationSec: s.durationSec,
          distanceM: s.distanceM,
          isPr: setImpact.has(s.id),
          prAfterKg: setImpact.get(s.id) ?? null,
        })),
        volume: xs.reduce((sum, s) => sum + setVolume(s), 0),
        pr: xs.some((s) => prSetIds.has(s.id)),
        note: xs.some((s) => s.failed)
          ? "rep terakhir gagal. tetep kecatat."
          : xs.every((s) => s.reps === null)
            ? xs[0].kind === "kardio"
              ? "kardio, dihitung terpisah dari volume."
              : "latihan durasi, dihitung terpisah dari volume."
            : xs.every((s) => s.weightKg === null)
            ? "pakai berat badan, gak masuk volume."
            : xs.some((s) => s.isAdded)
              ? "beban tambahan, gak masuk volume."
              : null,
      })),
    },
  };
}

// ---------- personal record ----------

export async function getPrPage(userId: string, slugParam?: string) {
  await connection();
  const now = new Date();
  const settings = await getSettings(userId);
  const tz = settings.timezone;
  const today = localDate(now, tz);

  const [prs, best, durations] = await Promise.all([getPrs(userId, tz), bestSets(userId), durationBests(userId)]);
  const addedByExercise = new Map(best.map((b) => [b.exerciseId, b.isAdded]));

  // pr terbaru + berapa lama rekor sebelumnya bertahan
  const latest = prs[0] ?? null;
  const beforeLatest = latest ? prs.find((p) => p.exerciseId === latest.exerciseId && p.at < latest.at) : undefined;

  // latihan yang punya riwayat pr, urut dari yang terakhir pecah
  const prExercises = [...new Map(prs.map((p) => [p.slug, { slug: p.slug, name: p.name, exerciseId: p.exerciseId }])).values()];
  const focus = prExercises.find((e) => e.slug === slugParam) ?? prExercises[0] ?? null;

  const journey = focus ? prs.filter((p) => p.exerciseId === focus.exerciseId).reverse() : [];
  const focusSets = focus ? await getSets(userId, tz, { exerciseId: focus.exerciseId, weightedOnly: true }) : [];
  const reps = repRecords(focusSets);

  return {
    unit: settings.unit,
    monthCount: prs.filter((p) => p.date.slice(0, 7) === today.slice(0, 7)).length,
    latest: latest && {
      name: latest.name,
      weightKg: latest.weightKg,
      reps: latest.reps,
      isAdded: addedByExercise.get(latest.exerciseId) ?? false,
      dateLabel: formatDayLong(latest.at, tz),
      increase: latest.previousWeightKg === null ? null : latest.weightKg - latest.previousWeightKg,
      previousKg: latest.previousWeightKg,
      heldWeeks: beforeLatest ? Math.max(1, Math.round(daysBetween(beforeLatest.date, latest.date) / 7)) : null,
    },
    records: best.map((b) => {
      const date = localDate(b.at, tz);
      const pr = prs.find((p) => p.exerciseId === b.exerciseId && p.weightKg === b.weightKg);
      return {
        name: b.name,
        weightKg: b.weightKg,
        isAdded: b.isAdded,
        reps: b.reps,
        dateLabel: formatDay(b.at, tz),
        isNew: !!pr && daysBetween(pr.date, today) <= 14,
        previousKg: pr?.previousWeightKg ?? null,
        daysHeld: daysBetween(date, today),
      };
    }),
    // pr durasi = durasi terlama (plank, wall sit, dead hang)
    durations: durations.map((d) => ({ name: d.name, sec: d.sec, dateLabel: formatDay(d.at, tz) })),
    exercises: prExercises.map(({ slug, name }) => ({ slug, name })),
    focus: focus && {
      slug: focus.slug,
      name: focus.name,
      isAdded: addedByExercise.get(focus.exerciseId) ?? false,
      start: journey[0]?.previousWeightKg ?? null,
      journey: journey.map((p) => ({ dateLabel: formatDay(p.at, tz), weightKg: p.weightKg })),
      spanWeeks: journey.length > 1 ? Math.max(1, Math.round(daysBetween(journey[0].date, journey[journey.length - 1].date) / 7)) : null,
      bestE1rm: addedByExercise.get(focus.exerciseId) ? null : reps.bestE1rm,
      byReps: reps.byReps.slice(0, 8),
      latestReps: journey[journey.length - 1]?.reps ?? null,
    },
  };
}

// durasi terlama per latihan durasi; kalau sama, yang pertama kali dicapai
async function durationBests(userId: string) {
  type Row = { exercise_id: number; duration_sec: number; created_at: string; exercises: { name: string } | null };
  const rows = await all<Row>((from, to) =>
    db()
      .from("sets")
      .select("exercise_id, duration_sec, created_at, exercises!inner(name, kind)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .not("duration_sec", "is", null)
      .eq("exercises.kind", "durasi")
      .order("created_at")
      .order("id")
      .range(from, to)
      .returns<Row[]>(),
  );
  const best = new Map<number, { name: string; sec: number; at: Date }>();
  for (const r of rows) {
    const cur = best.get(r.exercise_id);
    if (!cur || r.duration_sec > cur.sec) {
      best.set(r.exercise_id, { name: r.exercises?.name ?? "?", sec: r.duration_sec, at: new Date(r.created_at) });
    }
  }
  return [...best.values()].sort((a, b) => b.at.getTime() - a.at.getTime());
}

// ---------- profil ----------

export async function getProfil(userId: string) {
  await connection();
  const settings = await getSettings(userId);
  const count = async (table: "workout_sessions" | "sets") => {
    let q = db().from(table).select("id", { count: "exact", head: true }).eq("user_id", userId).is("deleted_at", null);
    if (table === "workout_sessions") q = q.gt("set_count", 0);
    const { count: n, error } = await q;
    if (error) throw new Error(error.message);
    return n ?? 0;
  };
  type ExerciseRow = {
    id: number;
    slug: string;
    name: string;
    aliases: string[];
    muscle: string;
    equipment: string;
    user_id: string | null;
  };
  type TemplateRow = { user_id: string | null; split: string; exercise_id: number; position: number };
  const [sessionCount, setCount, last, exercises, templates] = await Promise.all([
    count("workout_sessions"),
    count("sets"),
    getSessions(userId, settings.timezone, { limit: 1 }),
    all<ExerciseRow>((from, to) =>
      db()
        .from("exercises")
        .select("id, slug, name, aliases, muscle, equipment, user_id")
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .is("merged_into", null)
        .is("deleted_at", null)
        .neq("slug", "lain")
        .order("name")
        .range(from, to)
        .returns<ExerciseRow[]>(),
    ),
    all<TemplateRow>((from, to) =>
      db()
        .from("split_templates")
        .select("user_id, split, exercise_id, position")
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .order("position")
        .range(from, to)
        .returns<TemplateRow[]>(),
    ),
  ]);

  // template tiap split di program user: punya user kalau sudah diubah, kalau belum bawaan
  const splits = [...PROGRAM_SPLITS[settings.program]].filter((s) => s !== "bebas");
  const templateFor = (split: string) => {
    const own = templates.filter((t) => t.split === split && t.user_id === userId);
    const rows = own.length > 0 ? own : templates.filter((t) => t.split === split && t.user_id === null);
    return { split, custom: own.length > 0, exerciseIds: rows.map((r) => r.exercise_id) };
  };

  // latihan pribadi + jumlah setnya (untuk ganti nama / gabung)
  const personal = exercises.filter((e) => e.user_id === userId);
  const personalSets = personal.length
    ? await all<{ exercise_id: number }>((from, to) =>
        db()
          .from("sets")
          .select("exercise_id")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .in(
            "exercise_id",
            personal.map((e) => e.id),
          )
          .order("id")
          .range(from, to),
      )
    : [];

  return {
    name: displayName(settings),
    username: settings.username,
    joinedLabel: formatMonthYear(settings.joinedAt, settings.timezone),
    sessionCount,
    setCount,
    // contoh di bagian "setara dengan": volume sesi terakhir, atau 5.120 kg kalau belum ada
    exampleVolume: last[0]?.volume || 5120,
    settings: {
      weekly_target: settings.weeklyTarget,
      unit: settings.unit,
      program: settings.program,
      split_schedule: settings.splitSchedule,
      rest_allowance: settings.restAllowance,
      reminder_time: settings.reminderTime,
      chattiness: settings.chattiness,
      compare_mode: settings.compareMode,
      compare_item: settings.compareItem,
      notify_pr: settings.notifyPr,
      notify_weekly: settings.notifyWeekly,
      notify_schedule: settings.notifySchedule,
      auto_story: settings.autoStory,
    } satisfies SettingsRow,
    templates: splits.map(templateFor),
    exerciseOptions: exercises.map((e) => ({ id: e.id, slug: e.slug, name: e.name, aliases: e.aliases, muscle: e.muscle })),
    personal: personal.map((e) => ({
      id: e.id,
      name: e.name,
      muscle: e.muscle,
      equipment: e.equipment,
      setCount: personalSets.filter((s) => s.exercise_id === e.id).length,
    })),
    mergeTargets: exercises.filter((e) => e.user_id === null).map((e) => ({ id: e.id, name: e.name })),
  };
}

export type Profil = Awaited<ReturnType<typeof getProfil>>;
