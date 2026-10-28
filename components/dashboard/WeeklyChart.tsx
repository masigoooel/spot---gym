"use client";

import { useState } from "react";
import { formatNumber, toUnit, type Unit } from "@/lib/format";

type Props = {
  weeks: string[]; // label tiap minggu, mis. `12 okt`
  values: (number | null)[]; // kg, null = minggu itu tidak dilatih
  unit: Unit;
  name: string;
  height?: number;
};

const W = 600; // lebar viewBox; tinggi mengikuti prop height

// garis satu seri: beban terberat per minggu. crosshair + tooltip mengikuti pointer
// dan tombol panah; tabel tersembunyi untuk pembaca layar.
export function WeeklyChart({ weeks, values, unit, name, height = 200 }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const shown = values.map((v) => (v === null ? null : toUnit(v, unit)));
  const defined = shown.filter((v): v is number => v !== null);

  if (defined.length === 0) {
    return <p className="text-sm text-spot-muted">belum ada set berbeban di rentang ini.</p>;
  }

  const fmt = (v: number) => `${formatNumber(Math.round(v * 10) / 10)} ${unit}`;
  const min = Math.min(...defined);
  const max = Math.max(...defined);
  // batas sumbu dibulatkan ke kelipatan piringan terkecil yang umum (2,5 kg / 5 lb)
  const tick = unit === "kg" ? 2.5 : 5;
  const pad = Math.max(tick, (max - min) * 0.15);
  const lo = Math.max(0, Math.floor((min - pad) / tick) * tick);
  let hi = Math.ceil((max + pad) / tick) * tick;
  if (((hi - lo) / tick) % 2 === 1) hi += tick; // label tengah ikut bulat

  const n = shown.length;
  const xPct = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const yPct = (v: number) => (1 - (v - lo) / (hi - lo)) * 100;

  const pts = shown.flatMap((v, i) => (v === null ? [] : [{ i, v, x: (xPct(i) / 100) * W, y: (yPct(v) / 100) * height }]));
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${pts[0].x.toFixed(1)},${height} ${line} ${pts[pts.length - 1].x.toFixed(1)},${height}`;
  const lastPoint = pts[pts.length - 1];

  // label sumbu x tersebar rata: 8 di layar lebar, 4 di hp, supaya tidak tabrakan
  const spaced = (k: number) => new Set(Array.from({ length: k }, (_, j) => Math.round((j * (n - 1)) / Math.max(1, k - 1))));
  const wide = spaced(Math.min(n, 8));
  const narrow = spaced(Math.min(n, 4));
  const xLabels = weeks.map((w, i) => ({ w, i })).filter(({ i }) => wide.has(i));

  const pick = (clientX: number, rect: DOMRect) => {
    const i = Math.round(((clientX - rect.left) / rect.width) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  };

  const activeValue = active === null ? null : shown[active];

  return (
    <div className="flex gap-3">
      <div
        aria-hidden="true"
        className="flex min-w-[52px] flex-col justify-between text-right font-mono text-[11px] text-spot-muted"
        style={{ height }}
      >
        <span>{fmt(hi)}</span>
        <span>{fmt((hi + lo) / 2)}</span>
        <span>{fmt(lo)}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div
          role="group"
          aria-label={`grafik ${name}, geser atau pakai tombol panah untuk lihat tiap minggu`}
          tabIndex={0}
          className="relative cursor-crosshair touch-none border-b border-spot-line outline-none focus-visible:ring-2 focus-visible:ring-spot-orange/60"
          style={{ height }}
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(lastPoint.i)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n - 1) - 1));
            if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? 0) + 1));
          }}
        >
          <div className="absolute inset-x-0 top-0 border-t border-spot-line" />
          <div className="absolute inset-x-0 top-1/2 border-t border-spot-line" />

          <svg aria-hidden="true" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <polygon points={area} fill="var(--spot-orange)" fillOpacity={0.1} />
            <polyline
              points={line}
              fill="none"
              stroke="var(--spot-orange)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* titik akhir selalu tampil; titik aktif mengikuti crosshair */}
          {[lastPoint.i, ...(activeValue !== null && active !== lastPoint.i ? [active!] : [])].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-spot-orange ring-2 ring-spot-panel"
              style={{ left: `${xPct(i)}%`, top: `${yPct(shown[i]!)}%` }}
            />
          ))}

          {active !== null && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-px bg-spot-muted/60"
                style={{ left: `${xPct(active)}%` }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-spot-line-strong bg-spot-bg px-2.5 py-1.5"
                style={{ left: `clamp(56px, ${xPct(active)}%, calc(100% - 56px))` }}
              >
                <div className="text-sm font-semibold">{activeValue === null ? "gak latihan" : fmt(activeValue)}</div>
                <div className="font-mono text-[11px] text-spot-muted">minggu {weeks[active]}</div>
              </div>
            </>
          )}
        </div>

        <div aria-hidden="true" className="relative h-4 font-mono text-[11px] text-spot-muted">
          {xLabels.map(({ w, i }) => (
            <span
              key={i}
              className={`absolute whitespace-nowrap ${narrow.has(i) ? "" : "hidden sm:inline"}`}
              style={{
                left: `${xPct(i)}%`,
                transform: i === 0 ? "none" : i === n - 1 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {w}
            </span>
          ))}
        </div>

        <table className="sr-only">
          <caption>beban terberat per minggu, {name}</caption>
          <thead>
            <tr>
              <th scope="col">minggu</th>
              <th scope="col">beban</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w, i) => (
              <tr key={i}>
                <td>{w}</td>
                <td>{shown[i] === null ? "gak latihan" : fmt(shown[i]!)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
