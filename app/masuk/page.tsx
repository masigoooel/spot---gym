import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "masuk · spot." };

// tata letak dari artboard "Login" di canvas desain, isinya mengikuti alur login lewat /masuk di bot
export default function MasukPage({ searchParams }: PageProps<"/masuk">) {
  const bot = process.env.NEXT_PUBLIC_BOT_USERNAME;

  return (
    <div className="flex flex-1 flex-wrap">
      <div className="flex min-h-[320px] min-w-0 flex-[1_1_420px] flex-col justify-between gap-10 bg-spot-orange p-7 text-spot-bg md:p-14">
        <Link href="/" aria-label="kembali ke beranda spot." className="self-start text-[30px] leading-none">
          <span className="[&_polygon]:stroke-spot-bg [&_circle]:fill-spot-bg">
            <Logo />
          </span>
        </Link>
        <svg width="220" height="220" viewBox="0 0 56 56" aria-hidden="true" className="hidden max-w-[60%] self-center md:block">
          <polygon points="28,4 48.8,16 48.8,40 28,52 7.2,40 7.2,16" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
          <circle cx="28" cy="28" r="6.5" fill="currentColor" />
        </svg>
        <div className="flex flex-col gap-2">
          <span className="text-[clamp(36px,4vw,52px)] font-extrabold leading-none tracking-[-0.05em]">
            kamu angkat.
            <br />
            aku jagain.
          </span>
          <span className="font-mono text-sm">gak perlu password. akun telegram kamu kuncinya.</span>
        </div>
      </div>

      <main className="flex min-w-0 flex-[1_1_520px] flex-col justify-center gap-8 p-7 md:p-[72px]">
        <div className="flex max-w-[460px] flex-col gap-5">
          <span className="font-mono text-[13px] text-spot-muted">masuk ke dashboard</span>
          <h1 className="text-[40px] font-bold leading-[1.1] tracking-[-0.04em]">minta link masuk dari bot</h1>

          <Suspense fallback={null}>
            <LinkError searchParams={searchParams} />
          </Suspense>

          <ol className="flex flex-col gap-3.5 text-[17px] leading-relaxed text-spot-soft">
            <Step n={1}>buka bot spot. di telegram. belum pernah? tekan start dulu.</Step>
            <Step n={2}>
              kirim <code className="rounded-md bg-spot-chip px-1.5 py-0.5 font-mono text-spot-text">/masuk</code>.
            </Step>
            <Step n={3}>klik link yang aku kirim. berlaku 10 menit, sekali pakai.</Step>
          </ol>

          {bot && (
            <a
              href={`https://t.me/${bot}`}
              className="mt-2 flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-spot-orange font-semibold text-spot-bg transition-colors hover:bg-spot-orange-dark"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
              buka @{bot}
            </a>
          )}
          <span className="text-[13px] leading-relaxed text-spot-muted">
            spot. cuma nyimpen nama dan username telegram kamu. nomor hp gak pernah kebaca.
          </span>
        </div>
      </main>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="font-mono text-spot-orange">{n}</span>
      <span>{children}</span>
    </li>
  );
}

async function LinkError({ searchParams }: { searchParams: PageProps<"/masuk">["searchParams"] }) {
  const { gagal, akun } = await searchParams;
  if (akun === "dihapus") {
    return (
      <p role="status" className="rounded-xl border border-spot-line-strong px-4 py-3 text-[15px]">
        akunmu dijadwalkan dihapus 7 hari lagi. berubah pikiran? kirim pesan apa aja ke bot, terus tekan{" "}
        <span className="font-semibold">↩️ urungkan hapus akun</span>.
      </p>
    );
  }
  if (!gagal) return null;
  return (
    <p role="alert" className="rounded-xl border border-spot-heat-1 px-4 py-3 text-[15px]">
      link-nya udah kepakai atau kedaluwarsa. kirim <code className="font-mono">/masuk</code> lagi buat link baru.
    </p>
  );
}
