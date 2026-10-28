import Link from "next/link";
import { Suspense } from "react";
import { Heatmap } from "@/components/dashboard/Heatmap";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { Empty, Label, LoadingPage, Page, PageHeader, Panel, PanelTitle, SplitPill } from "@/components/dashboard/ui";
import { Ilustrasi } from "@/components/Ilustrasi";
import { getCurrentUser } from "@/lib/auth";
import { getRingkasan, type Ringkasan } from "@/lib/dashboard";
import { formatKg, formatNumber, toUnit, type Unit } from "@/lib/format";
import { formatCount } from "@/lib/setara";
import { changeSetara } from "./actions";

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <RingkasanView />
    </Suspense>
  );
}

async function RingkasanView() {
  const user = await getCurrentUser();
  const d = await getRingkasan(user.id);
  const { unit } = d;

  return (
    <Page>
      <PageHeader
        eyebrow={d.dateLabel}
        title={
          <>
            halo, {d.name}.{" "}
            {d.todayStatus === "libur"
              ? "hari ini kamu libur. santai dulu."
              : d.todayStatus === "geser"
                ? "jadwal hari ini udah digeser."
                : d.todaySplit
                  ? `hari ini jadwal ${d.todaySplit}.`
                  : "hari ini libur. santai dulu."}
          </>
        }
      >
        {d.botUsername && (
          <a
            href={`https://t.me/${d.botUsername}`}
            className="flex min-h-11 items-center rounded-full bg-spot-orange px-[18px] text-sm font-semibold text-spot-bg transition-colors hover:bg-spot-orange-dark"
          >
            + catat sesi
          </a>
        )}
      </PageHeader>

      <section aria-label="ringkasan angka" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="streak" value={d.streak} suffix="hari">
          <span className="text-[13px] text-spot-muted">rekor kamu {d.longestStreak} hari</span>
        </Stat>
        <Stat label="sesi minggu ini" value={d.week.sessions} suffix={`/ ${d.week.target}`}>
          <div
            role="progressbar"
            aria-label="sesi minggu ini dibanding target"
            aria-valuemin={0}
            aria-valuemax={d.week.target}
            aria-valuenow={d.week.sessions}
            className="h-1.5 overflow-hidden rounded-full bg-spot-line"
          >
            <div
              className="h-full rounded-full bg-spot-orange"
              style={{ width: `${Math.min(100, (d.week.sessions / d.week.target) * 100)}%` }}
            />
          </div>
        </Stat>
        <Stat label="volume minggu ini" value={formatNumber(Math.round(toUnit(d.week.volume, unit)))} suffix={unit}>
          <span className={`text-[13px] ${d.week.change !== null && d.week.change > 0 ? "text-spot-orange" : "text-spot-muted"}`}>
            {d.week.change === null
              ? "minggu lalu belum ada pembanding"
              : `${d.week.change >= 0 ? "+" : "−"}${Math.abs(d.week.change)}% dari minggu lalu`}
          </span>
        </Stat>
        <Stat label="pr bulan ini" value={d.prMonth.count}>
          <span className="text-[13px] text-spot-muted">
            {d.prMonth.latest
              ? `terbaru: ${d.prMonth.latest.name} ${formatKg(d.prMonth.latest.weightKg, unit)}`
              : "belum ada. pelan-pelan aja."}
          </span>
        </Stat>
      </section>

      <div className="flex flex-wrap gap-3">
        <LastSessionCard session={d.lastSession} unit={unit} bot={d.botUsername} />

        <Panel className="flex flex-[2_1_300px] flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <PanelTitle>personal record</PanelTitle>
            <Link href="/dashboard/pr" className="text-sm font-medium text-spot-orange hover:underline">
              semua
            </Link>
          </div>
          {d.prList.length === 0 ? (
            <Empty>belum ada rekor. set pertama tiap latihan jadi patokan, set berikutnya yang lebih berat jadi pr.</Empty>
          ) : (
            <ul>
              {d.prList.map((p) => (
                <li key={p.name} className="flex items-center justify-between border-b border-spot-line py-3 last:border-b-0">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{p.name}</span>
                    <span className="font-mono text-xs text-spot-muted">
                      {p.dateLabel} · {p.reps} rep
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {p.isNew && (
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-spot-orange">
                        <span aria-hidden="true" className="size-2 rounded-full bg-spot-orange" />
                        baru
                      </span>
                    )}
                    <span className="text-lg font-bold tracking-[-0.02em]">
                      {p.isAdded ? "+" : ""}
                      {formatKg(p.weightKg, unit)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="flex flex-wrap gap-3">
        <Panel className="flex-[2_1_520px]">
          <ProgressCard weeks={d.chart.weeks} exercises={d.chart.exercises} unit={unit} />
        </Panel>

        <Panel className="flex flex-[1_1_300px] flex-col gap-4">
          <PanelTitle hint={`12 minggu terakhir · ${d.heat.sessions} sesi`}>konsistensi</PanelTitle>
          <Heatmap cells={d.heat.cells} unit={unit} />
          <p className="mt-auto text-sm">
            {d.neglected ? (
              <>
                {d.neglected.split} day terakhir {d.neglected.days} hari lalu.{" "}
                <span className="text-spot-muted">dia nungguin.</span>
              </>
            ) : d.heat.sessions > 0 ? (
              <>
                semua jadwal kebagian. <span className="text-spot-muted">mantap.</span>
              </>
            ) : (
              <span className="text-spot-muted">kalendernya masih kosong. sesi pertama bakal nyalain titik pertama.</span>
            )}
          </p>
        </Panel>
      </div>

      <RecentSessions sessions={d.recent} unit={unit} />
    </Page>
  );
}

function Stat({
  label,
  value,
  suffix,
  children,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-[18px] border border-spot-line bg-spot-panel p-4 md:p-5">
      <Label>{label}</Label>
      <div className="text-3xl font-bold tracking-[-0.04em] md:text-4xl">
        {value}
        {suffix && <span className="ml-1.5 text-base font-medium tracking-normal text-spot-muted">{suffix}</span>}
      </div>
      {children}
    </div>
  );
}

function LastSessionCard({
  session,
  unit,
  bot,
}: {
  session: Ringkasan["lastSession"];
  unit: Unit;
  bot: string | null;
}) {
  const card = "flex min-w-0 flex-[3_1_460px] flex-col gap-2.5 rounded-[22px] bg-spot-orange p-6 text-spot-bg md:px-8 md:py-7";

  if (!session) {
    return (
      <section className={card}>
        <span className="font-mono text-[13px]">sesi terakhir</span>
        <p className="text-2xl font-semibold tracking-[-0.02em]">belum ada sesi. kirim set pertama kamu ke bot, rekapnya muncul di sini.</p>
        {bot && (
          <a
            href={`https://t.me/${bot}`}
            className="mt-2 inline-flex min-h-11 items-center self-start rounded-full bg-spot-bg px-[18px] text-sm font-semibold text-spot-text"
          >
            buka bot
          </a>
        )}
      </section>
    );
  }

  const { setara } = session;
  return (
    <section aria-label="sesi terakhir" className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[13px]">
          {session.open ? "sesi berjalan" : `sesi terakhir · ${session.weekday}`}
          {session.split ? `, ${session.split}` : ""}
        </span>
        {session.pr && (
          <span className="rounded-full bg-spot-bg px-2.5 py-1 font-mono text-xs text-spot-orange">
            pr baru · {session.pr.name} {formatNumber(toUnit(session.pr.weightKg, unit))}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-5">
        {/* tanpa min-w-0: angkanya tidak boleh menyusut, ilustrasinya yang turun ke bawah */}
        <div className="flex flex-[1_1_auto] flex-col gap-2.5">
          <span className="whitespace-nowrap text-[clamp(40px,4.8vw,72px)] font-extrabold leading-none tracking-[-0.05em]">
            {formatKg(session.volume, unit)}
          </span>
          {setara && (
            <span className="text-xl font-semibold tracking-[-0.02em] md:text-2xl">
              setara {formatCount(setara.count)} {setara.item.label}.{" "}
              <span className="font-medium opacity-75">{setara.item.quip}</span>
            </span>
          )}
        </div>
        {setara && (
          <div className="relative min-w-[200px] flex-[0_1_260px] overflow-hidden rounded-2xl bg-spot-bg px-2 pb-1 pt-3">
            <span className="absolute right-2.5 top-2.5 rounded-full bg-spot-orange px-2 py-0.5 font-mono text-xs font-medium">
              × {formatCount(setara.count)}
            </span>
            <Ilustrasi item={setara.item.id} />
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
        <span className="font-mono text-[13px]">
          {session.setCount} set · {session.minutes === null ? "masih jalan" : `${session.minutes} mnt`}
        </span>
        <div className="flex flex-wrap gap-2">
          {setara && session.canChangeSetara && (
            <form action={changeSetara.bind(null, session.id)}>
              <button
                type="submit"
                className="min-h-11 rounded-full border-[1.5px] border-spot-bg px-[18px] text-sm font-semibold transition-colors hover:bg-spot-bg/10"
              >
                ganti perbandingan
              </button>
            </form>
          )}
          <Link
            href={`/bagikan/${session.id}`}
            className="inline-flex min-h-11 items-center rounded-full bg-spot-bg px-[18px] text-sm font-semibold text-spot-text"
          >
            bagikan
          </Link>
        </div>
      </div>
    </section>
  );
}

function RecentSessions({ sessions, unit }: { sessions: Ringkasan["recent"]; unit: Unit }) {
  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <PanelTitle>sesi terakhir</PanelTitle>
        <Link href="/dashboard/riwayat" className="text-sm font-medium text-spot-orange hover:underline">
          semua riwayat
        </Link>
      </div>
      {sessions.length === 0 ? (
        <Empty>belum ada sesi.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="text-left font-mono text-xs text-spot-muted">
                <th scope="col" className="pb-2.5 font-normal">tanggal</th>
                <th scope="col" className="pb-2.5 font-normal">split</th>
                <th scope="col" className="pb-2.5 font-normal">latihan</th>
                <th scope="col" className="pb-2.5 text-right font-normal">set</th>
                <th scope="col" className="pb-2.5 text-right font-normal">volume</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-spot-line">
                  <td className="py-3.5">
                    <Link href={`/dashboard/riwayat/${s.id}`} className="text-spot-muted hover:text-spot-text hover:underline">
                      {s.dateLabel}
                    </Link>
                  </td>
                  <td className="py-3.5">
                    <SplitPill split={s.split} />
                  </td>
                  <td className="py-3.5">
                    {s.exercises.slice(0, 3).join(", ")}
                    {s.exercises.length > 3 && `, +${s.exercises.length - 3} lagi`}
                  </td>
                  <td className="py-3.5 text-right">{s.setCount}</td>
                  <td className="py-3.5 text-right font-semibold">{s.volume > 0 ? formatKg(s.volume, unit) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
