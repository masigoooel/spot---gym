import Link from "next/link";
import { Suspense } from "react";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { Empty, Label, LoadingPage, Page, PageHeader, Panel, PanelTitle } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { getProgres, RANGES, type RangeKey } from "@/lib/dashboard";
import { formatKg, formatNumber } from "@/lib/format";

export default function ProgresPage({ searchParams }: PageProps<"/dashboard/progres">) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <ProgresView searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function ProgresView({ searchParams }: { searchParams: PageProps<"/dashboard/progres">["searchParams"] }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const d = await getProgres(user.id, one(params.latihan), one(params.rentang));
  const { unit, detail } = d;
  const href = (slug: string | undefined, rentang: RangeKey) =>
    `/dashboard/progres?${new URLSearchParams({ ...(slug ? { latihan: slug } : {}), rentang })}`;
  const load = (kg: number, isAdded: boolean) => `${isAdded ? "+" : ""}${formatKg(kg, unit)}`;

  return (
    <Page>
      <PageHeader eyebrow="progres" title={detail?.name ?? "belum ada data"}>
        <nav aria-label="rentang waktu" className="flex gap-1.5">
          {(Object.keys(RANGES) as RangeKey[]).map((key) => {
            const on = key === d.range;
            return (
              <Link
                key={key}
                href={href(detail?.slug, key)}
                aria-current={on ? "true" : undefined}
                className={`flex min-h-11 items-center rounded-full border px-4 text-[13px] font-medium transition-colors ${
                  on ? "border-spot-text bg-spot-text text-spot-bg" : "border-spot-line-strong text-spot-soft hover:text-spot-text"
                }`}
              >
                {RANGES[key].label}
              </Link>
            );
          })}
        </nav>
      </PageHeader>

      {!detail ? (
        <Panel>
          <Empty>
            belum ada set berbeban. kirim set ke bot, misalnya <code className="font-mono text-spot-text">bench 60x8x3</code>,
            nanti progresnya muncul di sini.
          </Empty>
        </Panel>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          {/* di hp jadi satu baris yang bisa digeser, supaya grafik tidak terdorong jauh ke bawah */}
          <nav
            aria-label="pilih latihan"
            className="flex min-w-0 flex-[1_1_240px] gap-1 overflow-x-auto rounded-[22px] border border-spot-line bg-spot-panel p-2.5 lg:flex-col lg:overflow-visible"
          >
            {d.list.map((e) => {
              const on = e.slug === detail.slug;
              return (
                <Link
                  key={e.slug}
                  href={href(e.slug, d.range)}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-14 min-w-[180px] shrink-0 items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5 transition-colors lg:min-w-0 lg:shrink ${
                    on ? "bg-spot-orange text-spot-bg max-lg:order-first" : "hover:bg-spot-raised"
                  }`}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{e.name}</span>
                    <span className="font-mono text-xs opacity-75">
                      {e.gain === null ? "belum cukup data" : `${e.gain >= 0 ? "+" : "−"}${formatKg(Math.abs(e.gain), unit)}`}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-[15px] font-bold">{load(e.topKg, e.isAdded)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
              <Tile label="beban terberat">
                {load(detail.top.weightKg, detail.top.isAdded)}
                <span className="ml-1 text-lg text-spot-muted">× {detail.top.reps}</span>
              </Tile>
              <Tile label="perkiraan 1rm">{detail.e1rm === null ? "—" : `≈ ${formatKg(detail.e1rm, unit)}`}</Tile>
              <Tile label={RANGES[d.range].gain} accent>
                {detail.gain === null ? "—" : `${detail.gain >= 0 ? "+" : "−"}${formatKg(Math.abs(detail.gain), unit)}`}
              </Tile>
              <Tile label="dilatih">
                {formatNumber(Math.round(detail.perWeek * 10) / 10)}× <span className="text-lg text-spot-muted">/ minggu</span>
              </Tile>
            </div>

            <Panel className="flex flex-col gap-4">
              <PanelTitle>beban terberat per minggu</PanelTitle>
              <WeeklyChart weeks={d.weeks} values={detail.values} unit={unit} name={detail.name} height={260} />
            </Panel>

            <Panel className="flex flex-col">
              <h2 className="mb-2 text-lg font-bold tracking-[-0.02em]">3 sesi terakhir</h2>
              {detail.recent.map((r) => (
                <div key={r.sessionId} className="flex flex-wrap items-center justify-between gap-3 border-t border-spot-line py-3.5">
                  <Link
                    href={`/dashboard/riwayat/${r.sessionId}`}
                    className="min-w-[110px] font-mono text-[13px] text-spot-muted hover:text-spot-text hover:underline"
                  >
                    {r.dateLabel}
                  </Link>
                  <span className="flex-1 text-[15px]">{r.sets.join(" · ")}</span>
                  <span className="text-[15px] font-semibold">{r.volume > 0 ? formatKg(r.volume, unit) : "—"}</span>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      )}
    </Page>
  );
}

function Tile({ label, accent, children }: { label: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-[18px] border border-spot-line bg-spot-panel p-4 md:p-[18px]">
      <Label>{label}</Label>
      <span className={`whitespace-nowrap text-2xl font-bold tracking-[-0.04em] md:text-[30px] ${accent ? "text-spot-orange" : ""}`}>
        {children}
      </span>
    </div>
  );
}
