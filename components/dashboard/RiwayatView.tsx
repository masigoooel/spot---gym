import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteSessionButton, SessionSets, SessionUndoToast } from "@/components/dashboard/RiwayatEdit";
import { Empty, Page, PageHeader, Panel } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { getRiwayat } from "@/lib/dashboard";
import { formatKg } from "@/lib/format";
import { formatCount } from "@/lib/setara";

// daftar sesi per minggu + detail satu sesi. dipakai /dashboard/riwayat dan /dashboard/riwayat/[id].
export async function RiwayatView({
  selectedId,
  weeks,
  deletedId,
}: {
  selectedId?: string;
  weeks?: string;
  deletedId?: string; // sesi yang barusan dihapus: tampilkan toast urungkan
}) {
  const user = await getCurrentUser();
  const d = await getRiwayat(user.id, selectedId, weeks);
  if (!d) notFound();
  const { unit, detail } = d;
  const query = d.shownWeeks > 12 ? `?minggu=${d.shownWeeks}` : "";

  return (
    <Page>
      <PageHeader eyebrow="riwayat sesi" title="semua yang udah kamu angkat." />
      {deletedId && <SessionUndoToast key={deletedId} sessionId={deletedId} />}

      {d.weeks.length === 0 && !detail ? (
        <Panel>
          <Empty>belum ada sesi. kirim set pertama ke bot, nanti riwayatnya muncul di sini.</Empty>
        </Panel>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <nav aria-label="daftar sesi" className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
            {d.weeks.map((w) => (
              <div key={w.label} className="flex flex-col gap-2">
                <div className="flex justify-between px-1 font-mono text-xs text-spot-muted">
                  <span>{w.label}</span>
                  <span>{formatKg(w.volume, unit)}</span>
                </div>
                {w.items.map((s) => {
                  const on = s.id === detail?.id;
                  return (
                    <Link
                      key={s.id}
                      href={`/dashboard/riwayat/${s.id}${query}#detail`}
                      aria-current={on ? "page" : undefined}
                      className={`flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border px-[18px] py-3.5 transition-colors ${
                        on
                          ? "border-spot-orange bg-spot-orange text-spot-bg"
                          : "border-spot-line bg-spot-panel hover:border-spot-line-strong"
                      }`}
                    >
                      <span className="flex flex-col gap-1">
                        <span className="font-mono text-xs opacity-75">{s.dateLabel}</span>
                        <span className="text-[17px] font-bold tracking-[-0.02em]">{s.split ?? "bebas"}</span>
                      </span>
                      <span className="flex flex-col gap-1 text-right">
                        <span className="text-[17px] font-bold tracking-[-0.02em]">{s.volume > 0 ? formatKg(s.volume, unit) : "—"}</span>
                        <span className="font-mono text-xs opacity-75">
                          {s.setCount} set · {s.minutes === null ? "jalan" : `${s.minutes} mnt`}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
            {d.hasOlder && (
              <Link
                href={`/dashboard/riwayat${detail ? `/${detail.id}` : ""}?minggu=${d.shownWeeks + 12}`}
                className="flex min-h-11 items-center justify-center rounded-full border border-spot-line-strong text-sm font-medium hover:border-spot-text"
              >
                lihat 12 minggu sebelumnya
              </Link>
            )}
          </nav>

          {detail && (
            <section
              id="detail"
              aria-label="detail sesi"
              className="flex min-w-0 flex-[2_1_480px] scroll-mt-4 flex-col gap-5 rounded-[22px] border border-spot-line bg-spot-panel p-5 md:p-7 lg:sticky lg:top-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[13px] text-spot-muted">{detail.dateLabel}</span>
                  <h2 className="text-[30px] font-bold tracking-[-0.04em]">sesi {detail.split ?? "bebas"}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/bagikan/${detail.id}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-spot-line-strong px-[18px] text-sm font-medium hover:border-spot-text"
                  >
                    bagikan ke story
                  </Link>
                  <DeleteSessionButton
                    sessionId={detail.id}
                    label={`sesi ${detail.split ?? "bebas"} ${detail.dateLabel}`}
                    setCount={detail.setCount}
                    volume={detail.volume}
                    prLost={detail.prLost}
                    unit={unit}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Fact label="volume">{formatKg(detail.volume, unit)}</Fact>
                <Fact label="set">{detail.setCount}</Fact>
                <Fact label="durasi">{detail.minutes === null ? "masih jalan" : `${detail.minutes} mnt`}</Fact>
                <Fact label="setara" accent>
                  {detail.setara ? `${formatCount(detail.setara.count)} ${detail.setara.item.label}` : "—"}
                </Fact>
              </div>

              <SessionSets exercises={detail.exercises} unit={unit} />
            </section>
          )}
        </div>
      )}
    </Page>
  );
}

function Fact({ label, accent, children }: { label: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1 rounded-[14px] p-3.5 ${accent ? "bg-spot-orange text-spot-bg" : "bg-spot-bg"}`}>
      <span className={`font-mono text-[11px] ${accent ? "" : "text-spot-muted"}`}>{label}</span>
      <span className="text-xl font-bold tracking-[-0.03em]">{children}</span>
    </div>
  );
}
