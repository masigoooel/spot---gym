"use client";

import { useState } from "react";
import { formatKg, type Unit } from "@/lib/format";
import { WeeklyChart } from "./WeeklyChart";

type Exercise = { slug: string; name: string; values: (number | null)[] };

// kartu "progres" di ringkasan: pilih latihan, lihat beban terberat 8 minggu terakhir
export function ProgressCard({ weeks, exercises, unit }: { weeks: string[]; exercises: Exercise[]; unit: Unit }) {
  const [slug, setSlug] = useState(exercises[0]?.slug);
  const ex = exercises.find((e) => e.slug === slug) ?? exercises[0];

  if (!ex) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold tracking-[-0.02em]">progres</h2>
        <p className="text-sm text-spot-muted">
          belum ada set berbeban 8 minggu terakhir. kirim set ke bot, nanti grafiknya keisi sendiri.
        </p>
      </div>
    );
  }

  const defined = ex.values.filter((v): v is number => v !== null);
  const first = defined[0];
  const current = defined[defined.length - 1];
  const delta = current - first;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-[-0.02em]">progres {ex.name}</h2>
          <span className="text-[13px] text-spot-muted">beban terberat per minggu, 8 minggu terakhir</span>
        </div>
        {exercises.length > 1 && (
          <div role="group" aria-label="pilih latihan" className="flex flex-wrap gap-1.5">
            {exercises.map((e) => {
              const on = e.slug === ex.slug;
              return (
                <button
                  key={e.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSlug(e.slug)}
                  className={`min-h-11 rounded-full border px-4 text-[13px] font-medium transition-colors ${
                    on
                      ? "border-spot-text bg-spot-text text-spot-bg"
                      : "border-spot-line-strong text-spot-soft hover:text-spot-text"
                  }`}
                >
                  {e.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="whitespace-nowrap text-[40px] font-bold tracking-[-0.04em]">{formatKg(current, unit)}</span>
        {defined.length > 1 && (
          <span className="font-mono text-[13px] text-spot-orange">
            {delta >= 0 ? "+" : "−"}
            {formatKg(Math.abs(delta), unit)} dalam 8 minggu
          </span>
        )}
      </div>

      <WeeklyChart weeks={weeks} values={ex.values} unit={unit} name={ex.name} />
    </div>
  );
}
