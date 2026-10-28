"use server";

import { refresh } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { fromUnit } from "@/lib/format";
import * as hapus from "@/lib/hapus";
import { getSettings } from "@/lib/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isId = (id: unknown): id is string => typeof id === "string" && UUID.test(id);

type Result = { ok: boolean; error?: string };

export async function deleteSet(setId: string): Promise<Result> {
  const userId = await requireUserId();
  if (!isId(setId)) return { ok: false };
  const ok = !!(await hapus.deleteSet(userId, setId));
  refresh();
  return { ok };
}

export async function restoreSet(setId: string): Promise<Result> {
  const userId = await requireUserId();
  if (!isId(setId)) return { ok: false };
  const ok = !!(await hapus.restoreSet(userId, setId));
  refresh();
  return { ok };
}

export async function deleteSession(sessionId: string): Promise<Result> {
  const userId = await requireUserId();
  if (!isId(sessionId)) return { ok: false };
  return { ok: await hapus.deleteSession(userId, sessionId) };
}

export async function restoreSession(sessionId: string): Promise<Result> {
  const userId = await requireUserId();
  if (!isId(sessionId)) return { ok: false };
  const ok = await hapus.restoreSession(userId, sessionId);
  refresh();
  return { ok };
}

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

// ubah satu set. beban di satuan user (kosong = berat badan); durasi dalam detik; jarak dalam km.
export async function updateSet(setId: string, input: unknown): Promise<Result> {
  const userId = await requireUserId();
  if (!isId(setId) || typeof input !== "object" || input === null) return { ok: false };
  const set = await hapus.getSetInfo(userId, setId);
  if (!set || set.deleted) return { ok: false };
  const v = input as Record<string, unknown>;

  if (set.reps !== null) {
    const weight = num(v.weight);
    const reps = num(v.reps);
    if (reps === null || !Number.isInteger(reps) || reps < 1 || reps > 999) return { ok: false, error: "rep-nya 1 sampai 999." };
    if (weight !== null && (!Number.isFinite(weight) || weight <= 0 || weight > 2000)) {
      return { ok: false, error: "bebannya belum pas. kosongin kalau berat badan." };
    }
    const { unit } = await getSettings(userId);
    await hapus.updateSet(userId, setId, {
      weightKg: weight === null ? null : fromUnit(weight, unit),
      reps,
      failed: v.failed === true,
      durationSec: null,
      distanceM: null,
    });
  } else {
    const sec = num(v.durationSec);
    const km = num(v.distanceKm);
    if (sec === null || !Number.isInteger(sec) || sec < 1 || sec > 86_400) return { ok: false, error: "durasinya belum pas." };
    if (km !== null && (!Number.isFinite(km) || km <= 0 || km > 1000)) return { ok: false, error: "jaraknya belum pas." };
    await hapus.updateSet(userId, setId, {
      weightKg: set.weightKg,
      reps: null,
      failed: false,
      durationSec: sec,
      distanceM: km === null ? null : Math.round(km * 1000),
    });
  }
  refresh();
  return { ok: true };
}
