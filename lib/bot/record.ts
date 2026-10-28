// mencatat set ke sesi: dipakai kartu latihan (tombol & ketik cepat) dan pencarian latihan.
// tidak mengirim pesan apa pun: hasilnya ditampilkan di kartu (lib/bot/kartu.ts).

import { copy } from "@/lib/copy";
import { formatDuration, formatKg, fromUnit } from "@/lib/format";
import type { ExerciseRef, ParsedSet } from "@/lib/parser";
import { SESSION_IDLE_MS, detectDurationPr, detectPr, localDate, plannedSplit, weekStart } from "@/lib/workout";
import * as store from "./store";

// mode /kemarin masih berlaku kalau diaktifkan belum lewat 3 jam
export function backdateActive(state: store.BotState, now: Date) {
  return state.backdate && now.getTime() - state.updatedAt.getTime() < SESSION_IDLE_MS;
}

// angka yang diketik user ada di satuan pilihannya; disimpan selalu dalam kg
export const typedToKg = (sets: ParsedSet[], user: store.User): ParsedSet[] =>
  sets.map((s) => ({ ...s, weightKg: s.weightKg === null ? null : fromUnit(s.weightKg, user.unit) }));

// sesi yang sedang jalan, atau dibuka diam-diam (tanpa pesan "dimulai") dengan split dari jadwal hari itu.
// sesi baru = kartu, baris padat, dan daftar latihan yang dilewati mulai dari kosong.
export async function ensureSession(user: store.User, now: Date, opts: { split?: string | null } = {}) {
  const state = await store.getState(user.id);
  const backdated = backdateActive(state, now);
  const active = await store.getActiveSession(user.id, now, { backdated });
  if (active) return active;
  const at = backdated ? new Date(now.getTime() - 86_400_000) : now;
  const split = opts.split !== undefined && opts.split !== null ? opts.split : await plannedSplitFor(user, now);
  await store.setState(user.id, store.CARD_RESET);
  return store.openSession(user.id, split, at, { backdated });
}

// split jadwal hari ini (atau kemarin, kalau mode /kemarin aktif); null = bukan hari latihan
export async function plannedSplitFor(user: store.User, now: Date) {
  const state = await store.getState(user.id);
  const at = backdateActive(state, now) ? new Date(now.getTime() - 86_400_000) : now;
  const day = localDate(at, user.timezone);
  return plannedSplit(day, user.splitSchedule, await store.getWeekStatuses(user.id, weekStart(day)));
}

// catat set (beban sudah dalam kg). balikan: sesi, id set, urutan set pertama, dan kalimat pr kalau ada.
export async function logSets(user: store.User, exercise: ExerciseRef, sets: ParsedSet[], rawText: string) {
  const now = new Date();
  const state = await store.getState(user.id);
  const at = backdateActive(state, now) ? new Date(now.getTime() - 86_400_000) : now;
  const session = await ensureSession(user, now);

  // patokan pr diambil sebelum set baru masuk
  const timed = sets.every((s) => s.reps === null);
  const previousBest = timed ? null : await store.previousBestKg(user.id, exercise.id);
  const previousSec = timed && exercise.kind === "durasi" ? await store.previousBestSec(user.id, exercise.id) : null;
  const { ids, firstOrder } = await store.addSets(user.id, session.id, exercise.id, sets, rawText, at);

  let prText: string | null = null;
  if (!timed) {
    const pr = detectPr(previousBest, sets);
    if (pr) {
      await store.insertPr(user.id, exercise.id, ids[pr.index], pr, at);
      if (user.notifyPr) prText = copy.card.pr(formatKg(pr.weightKg - pr.previousWeightKg, user.unit));
    }
  } else {
    // pr durasi dihitung langsung dari set (tidak disimpan di personal_records)
    const pr = detectDurationPr(previousSec, sets);
    if (pr && user.notifyPr) prText = copy.card.prDuration(formatDuration(pr.durationSec - pr.previousSec));
  }

  // latihan ini jadi fokus: set tanpa nama berikutnya masuk ke sini
  await store.setState(user.id, { focusExerciseId: exercise.id, awaiting: null, awaitingData: {} });
  return { session, ids, firstOrder, prText };
}
