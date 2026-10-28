import { formatKg, type Unit } from "@/lib/format";
import type { HeatCell } from "@/lib/stats";

const LEVEL = ["bg-spot-line", "bg-spot-heat-1", "bg-spot-heat-2", "bg-spot-orange"] as const;

// kalender konsistensi: kolom = minggu, baris = senin…minggu. satu warna, makin
// terang makin berat volumenya. detail tiap hari ada di tooltip (title).
export function Heatmap({ cells, unit }: { cells: (HeatCell & { label: string })[]; unit: Unit }) {
  const trained = cells.filter((c) => c.sessions > 0).length;
  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={`kalender latihan 12 minggu terakhir: ${trained} hari latihan`}
        className="grid grid-flow-col grid-rows-7 gap-[5px] overflow-x-auto"
        style={{ gridAutoColumns: "16px" }}
      >
        {cells.map((c) => (
          <div
            key={c.date}
            title={
              c.future
                ? undefined
                : c.sessions > 0
                  ? `${c.label} · ${c.volume > 0 ? formatKg(c.volume, unit) : "berat badan"}`
                  : `${c.label} · gak latihan`
            }
            className={`size-4 rounded-full ${c.future ? "border border-spot-line" : LEVEL[c.level]}`}
          />
        ))}
      </div>
      <div aria-hidden="true" className="flex items-center gap-1.5 font-mono text-[11px] text-spot-muted">
        <span>libur</span>
        {LEVEL.map((cls) => (
          <span key={cls} className={`size-3 rounded-full ${cls}`} />
        ))}
        <span>berat</span>
      </div>
    </div>
  );
}
