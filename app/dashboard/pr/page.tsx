import Link from "next/link";
import { Suspense } from "react";
import { Empty, LoadingPage, Page, PageHeader, Panel, PanelTitle } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { getPrPage } from "@/lib/dashboard";
import { formatDuration, formatKg, formatNumber, toUnit } from "@/lib/format";

export default function PrPage({ searchParams }: PageProps<"/dashboard/pr">) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <PrView searchParams={searchParams} />
    </Suspense>
  );
}

// warna batang perjalanan pr: makin baru makin terang (satu hue, seperti kalender)
const BAR = ["bg-spot-heat-1", "bg-spot-heat-2", "bg-spot-orange-dark", "bg-spot-orange"] as const;

async function PrView({ searchParams }: { searchParams: PageProps<"/dashboard/pr">["searchParams"] }) {
  const { latihan } = await searchParams;
  const user = await getCurrentUser();
  const d = await getPrPage(user.id, Array.isArray(latihan) ? latihan[0] : latihan);
  const { unit, latest, focus } = d;
  const kg = (v: number, added = false) => `${added ? "+" : ""}${formatKg(v, unit)}`;
  const num = (v: number) => formatNumber(toUnit(v, unit));

  return (
    <Page>
      <PageHeader
        eyebrow="personal record"
        title={
          d.monthCount > 0 ? (
            <>
              {d.monthCount} rekor baru bulan ini. <span className="text-spot-muted">lumayan.</span>
            </>
          ) : (
            <>
              belum ada rekor bulan ini. <span className="text-spot-muted">pelan-pelan aja.</span>
            </>
          )
        }
      />

      {!latest ? (
        <Panel>
          <Empty>
            belum ada pr. set pertama tiap latihan jadi patokan; begitu kamu angkat lebih berat dari itu, rekornya muncul di
            sini.
          </Empty>
        </Panel>
      ) : (
        <section className="flex flex-wrap items-end justify-between gap-6 rounded-[22px] bg-spot-orange p-6 text-spot-bg md:px-8 md:py-7">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[13px]">pr terbaru · {latest.dateLabel}</span>
            <span className="text-[22px] font-semibold">{latest.name}</span>
            <span className="whitespace-nowrap text-[clamp(44px,6vw,72px)] font-extrabold leading-none tracking-[-0.05em]">
              {kg(latest.weightKg, latest.isAdded)} <span className="text-[0.45em] tracking-[-0.03em]">× {latest.reps}</span>
            </span>
          </div>
          {latest.increase !== null && latest.previousKg !== null && (
            <div className="flex max-w-xs flex-col gap-1.5">
              <span className="text-lg font-semibold">naik {formatKg(latest.increase, unit)} dari rekor sebelumnya.</span>
              <span className="text-[15px] opacity-80">
                rekor lama {kg(latest.previousKg, latest.isAdded)}
                {latest.heldWeeks ? `, bertahan ${latest.heldWeeks} minggu.` : "."}
              </span>
            </div>
          )}
        </section>
      )}

      {d.records.length > 0 && (
        <section aria-label="semua rekor" className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {d.records.map((r) => (
            <div key={r.name} className="flex flex-col gap-2.5 rounded-[18px] border border-spot-line bg-spot-panel p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold">{r.name}</span>
                {r.isNew && (
                  <span className="rounded-full bg-spot-orange px-2 py-0.5 font-mono text-[11px] text-spot-bg">baru</span>
                )}
              </div>
              <span className="whitespace-nowrap text-[32px] font-bold tracking-[-0.04em]">
                {kg(r.weightKg, r.isAdded)} <span className="text-lg text-spot-muted">× {r.reps}</span>
              </span>
              <span className="font-mono text-xs text-spot-muted">
                {r.dateLabel} ·{" "}
                {r.isNew && r.previousKg !== null
                  ? `sebelumnya ${r.isAdded ? "+" : ""}${num(r.previousKg)}`
                  : r.daysHeld === 0
                    ? "dari hari ini"
                    : `belum pecah ${r.daysHeld} hari`}
              </span>
            </div>
          ))}
        </section>
      )}

      {d.durations.length > 0 && (
        <section aria-label="rekor durasi" className="flex flex-col gap-2">
          <h2 className="px-1 font-mono text-xs text-spot-muted">durasi terlama</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {d.durations.map((r) => (
              <div key={r.name} className="flex flex-col gap-2.5 rounded-[18px] border border-spot-line bg-spot-panel p-5">
                <span className="text-base font-semibold">{r.name}</span>
                <span className="whitespace-nowrap text-[32px] font-bold tracking-[-0.04em]">{formatDuration(r.sec)}</span>
                <span className="font-mono text-xs text-spot-muted">{r.dateLabel}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {focus && (
        <div className="flex flex-wrap gap-3">
          <Panel className="flex flex-[2_1_460px] flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <PanelTitle hint="tiap baris = satu kali mecahin rekor">perjalanan pr {focus.name}</PanelTitle>
              {d.exercises.length > 1 && (
                <nav aria-label="pilih latihan" className="flex flex-wrap gap-1.5">
                  {d.exercises.map((e) => {
                    const on = e.slug === focus.slug;
                    return (
                      <Link
                        key={e.slug}
                        href={`/dashboard/pr?latihan=${encodeURIComponent(e.slug)}`}
                        aria-current={on ? "true" : undefined}
                        className={`flex min-h-11 items-center rounded-full border px-4 text-[13px] font-medium transition-colors ${
                          on
                            ? "border-spot-text bg-spot-text text-spot-bg"
                            : "border-spot-line-strong text-spot-soft hover:text-spot-text"
                        }`}
                      >
                        {e.name}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            <Journey start={focus.start} rows={focus.journey} isAdded={focus.isAdded} kg={kg} />

            {focus.start !== null && focus.journey.length > 0 && (
              <p className="text-sm">
                +{formatKg(focus.journey[focus.journey.length - 1].weightKg - focus.start, unit)}
                {focus.spanWeeks ? ` dalam ${focus.spanWeeks} minggu.` : "."}{" "}
                <span className="text-spot-muted">pelan, tapi naik terus.</span>
              </p>
            )}
          </Panel>

          <Panel className="flex flex-[1_1_280px] flex-col gap-3">
            <PanelTitle hint={focus.name}>rekor per jumlah rep</PanelTitle>
            <dl>
              {focus.bestE1rm !== null && (
                <div className="flex justify-between border-b border-spot-line py-3">
                  <dt className="font-mono text-sm text-spot-muted">perkiraan 1 rep</dt>
                  <dd className="font-bold">≈ {formatKg(focus.bestE1rm, unit)}</dd>
                </div>
              )}
              {focus.byReps.map((r) => (
                <div key={r.reps} className="flex justify-between border-b border-spot-line py-3 last:border-b-0">
                  <dt className="font-mono text-sm text-spot-muted">{r.reps} rep</dt>
                  <dd className={`font-bold ${r.reps === focus.latestReps ? "text-spot-orange" : ""}`}>
                    {kg(r.weightKg, focus.isAdded)}
                  </dd>
                </div>
              ))}
            </dl>
            {focus.bestE1rm !== null && (
              <p className="text-xs leading-relaxed text-spot-muted">
                perkiraan 1 rep pakai rumus epley. cuma estimasi, jangan dicoba tanpa spotter beneran.
              </p>
            )}
          </Panel>
        </div>
      )}
    </Page>
  );
}

function Journey({
  start,
  rows,
  isAdded,
  kg,
}: {
  start: number | null;
  rows: { dateLabel: string; weightKg: number }[];
  isAdded: boolean;
  kg: (v: number, added?: boolean) => string;
}) {
  const all = [...(start !== null ? [{ dateLabel: "awal", weightKg: start }] : []), ...rows];
  const min = Math.min(...all.map((r) => r.weightKg));
  const max = Math.max(...all.map((r) => r.weightKg));
  // batang dimulai dari 40% supaya selisih kecil tetap kelihatan bedanya
  const width = (w: number) => (max === min ? 100 : 40 + (60 * (w - min)) / (max - min));

  return (
    <ol className="flex flex-col gap-2.5">
      {all.map((r, i) => {
        const last = i === all.length - 1;
        const tone = last ? BAR[3] : BAR[Math.min(2, Math.floor((i / Math.max(1, all.length - 1)) * 3))];
        return (
          <li key={i} className="flex items-center gap-3" title={`${r.dateLabel}: ${kg(r.weightKg, isAdded)}`}>
            <span className={`w-16 shrink-0 font-mono text-xs ${last ? "text-spot-orange" : "text-spot-muted"}`}>{r.dateLabel}</span>
            <div className="h-7 flex-1 rounded-lg bg-spot-chip">
              <div className={`h-full rounded-lg ${tone}`} style={{ width: `${width(r.weightKg)}%` }} />
            </div>
            <span className={`w-[76px] shrink-0 text-right text-sm ${last ? "font-bold text-spot-orange" : "font-semibold"}`}>
              {kg(r.weightKg, isAdded)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
