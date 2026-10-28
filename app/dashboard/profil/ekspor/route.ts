import { requireUserId } from "@/lib/auth";
import { getSessions, getSets, getSettings } from "@/lib/queries";

// unduh semua set (yang belum dihapus) sebagai csv, satu baris = satu set. berat selalu dalam kg.
export async function GET() {
  const userId = await requireUserId();
  const { timezone } = await getSettings(userId);
  const [sets, sessions] = await Promise.all([getSets(userId, timezone), getSessions(userId, timezone)]);
  const split = new Map(sessions.map((s) => [s.id, s.split ?? ""]));

  const time = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
  const cell = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows: (string | number | null)[][] = [
    ["tanggal", "jam", "split", "latihan", "berat_kg", "beban_tambahan", "rep", "durasi_detik", "jarak_m", "gagal", "drop_set"],
    ...sets.map((s) => [
      s.date,
      time.format(s.at),
      split.get(s.sessionId) ?? "",
      s.name,
      s.weightKg,
      s.isAdded ? "ya" : "tidak",
      s.reps,
      s.durationSec,
      s.distanceM,
      s.failed ? "ya" : "tidak",
      s.isDrop ? "ya" : "tidak",
    ]),
  ];
  // bom di depan supaya excel membaca utf-8 dengan benar
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="spot-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
