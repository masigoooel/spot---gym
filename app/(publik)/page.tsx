import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { findItem, formatCount, type Item } from "@/lib/setara";

export const metadata: Metadata = {
  title: "spot. — catat latihan gym lewat telegram",
  description: "kirim set ke bot telegram sambil istirahat. spot. nyatet semuanya dan ngerangkum progresmu jadi dashboard.",
};

const BOT = process.env.NEXT_PUBLIC_BOT_USERNAME;
const START = BOT ? `https://t.me/${BOT}` : "/masuk";

// contoh di pita oranye, dihitung dengan fungsi yang sama dengan rekap bot
const EXAMPLE_KG = 5120;
const example = (["mobil", "gajah", "kucing"] as Item["id"][])
  .map((id) => findItem(id)!)
  .map((i) => `${formatCount(EXAMPLE_KG / i.kg)} ${i.label.split(" ")[0]}`)
  .join(". ");

const container = "mx-auto w-full max-w-[1200px] px-4 md:px-10";

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col">
      <header className={`${container} flex flex-wrap items-center justify-between gap-4 py-6`}>
        <Link href="/" aria-label="spot. beranda" className="text-[30px] leading-none">
          <Logo />
        </Link>
        <nav aria-label="navigasi" className="flex flex-wrap items-center gap-1 md:gap-2">
          <a href="#cara-kerja" className="hidden px-3.5 py-3 text-[15px] text-spot-soft hover:text-spot-text sm:block">
            cara kerja
          </a>
          <a href="#fitur" className="hidden px-3.5 py-3 text-[15px] text-spot-soft hover:text-spot-text sm:block">
            fitur
          </a>
          <a href="#filosofi" className="hidden px-3.5 py-3 text-[15px] text-spot-soft hover:text-spot-text sm:block">
            filosofi
          </a>
          <Link href="/masuk" className="px-3.5 py-3 text-[15px] text-spot-soft hover:text-spot-text">
            masuk
          </Link>
          <a
            href={START}
            className="inline-flex min-h-11 items-center rounded-full bg-spot-orange px-5 text-[15px] font-semibold text-spot-bg hover:bg-spot-orange-dark"
          >
            mulai
          </a>
        </nav>
      </header>

      <main>
        {/* hero */}
        <section className={`${container} flex flex-wrap items-center gap-14 pb-20 pt-10 md:pt-16`}>
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-6">
            <span className="self-start rounded-full border border-spot-heat-1 px-3 py-1.5 font-mono text-[13px] text-spot-orange">
              gym log lewat telegram
            </span>
            <h1 className="text-[clamp(48px,7vw,88px)] font-extrabold leading-[0.95] tracking-[-0.06em]">
              kamu angkat.
              <br />
              <span className="text-spot-orange">aku jagain.</span>
            </h1>
            <p className="max-w-[520px] text-xl leading-relaxed text-spot-soft">
              kirim set kamu ke bot telegram sambil istirahat. spot. nyatet semuanya, terus ngerangkum progresmu jadi
              dashboard yang enak dibaca.
            </p>
            <div className="mt-2 flex flex-wrap gap-2.5">
              <a
                href={START}
                className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-spot-orange px-6 font-semibold text-spot-bg hover:bg-spot-orange-dark"
              >
                <PlaneIcon />
                mulai lewat telegram
              </a>
              <Link
                href="/masuk"
                className="inline-flex min-h-[52px] items-center rounded-full border border-spot-line-strong px-6 font-medium hover:border-spot-text"
              >
                udah pakai? masuk dashboard
              </Link>
            </div>
          </div>

          <div className="flex min-w-0 flex-[1_1_380px] justify-center">
            <ChatMock />
          </div>
        </section>

        {/* pita setara */}
        <section className="bg-spot-orange text-spot-bg">
          <div className={`${container} flex flex-wrap items-end justify-between gap-8 py-16`}>
            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-sm">tiap habis latihan, spot. ngitung total angkatanmu</span>
              <span className="text-[clamp(56px,9vw,120px)] font-extrabold leading-[0.9] tracking-[-0.06em]">5.120 kg</span>
            </div>
            <div className="flex max-w-[420px] flex-col gap-1.5">
              <span className="text-4xl font-bold leading-tight tracking-[-0.04em]">= {example}.</span>
              <span className="text-[17px] opacity-80">
                angka yang tadinya abstrak, sekarang kebayang. bisa langsung dibagi ke story juga.
              </span>
            </div>
          </div>
        </section>

        {/* cara kerja */}
        <section id="cara-kerja" className={`${container} flex scroll-mt-4 flex-col gap-10 pb-12 pt-24`}>
          <SectionTitle eyebrow="cara kerja">tiga langkah. gak perlu buka aplikasi pas latihan.</SectionTitle>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            <Step n="01" title="sapa botnya">
              buka spot. di telegram, tekan start. bot langsung kenal kamu, gak perlu bikin akun atau password.
            </Step>
            <Step n="02" title="kirim set kamu">
              ketik aja pas istirahat antar set. formatnya simpel:
              <code className="mt-3.5 inline-block rounded-[10px] bg-spot-chip px-3 py-2 font-mono text-[15px] text-spot-text">
                bench 70x8x3
              </code>
            </Step>
            <Step n="03" title="lihat progresmu">
              kirim <code className="font-mono text-spot-text">/masuk</code> ke bot buat buka dashboard. grafik, pr, streak,
              dan rekap sesi udah nunggu di sana.
            </Step>
          </ol>
        </section>

        {/* fitur */}
        <section id="fitur" className={`${container} flex scroll-mt-4 flex-col gap-10 py-12`}>
          <SectionTitle eyebrow="fitur">yang kamu butuhin, gak lebih.</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            <Feature title="grafik progres" icon={<path d="M3 3v18h18M7 15l4-4 3 3 5-6" />}>
              beban terberat per minggu buat tiap latihan. kelihatan jelas kapan naik, kapan stuck.
            </Feature>
            <Feature
              title="notifikasi pr"
              icon={<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4" />}
            >
              begitu kamu mecahin rekor, bot langsung ngabarin. gak ada pr yang kelewat.
            </Feature>
            <Feature
              title="streak & konsistensi"
              icon={
                <>
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </>
              }
            >
              kalender 12 minggu yang nunjukin seberapa rutin kamu. termasuk leg day yang suka dilewatin.
            </Feature>
            <Feature
              title="kartu story"
              icon={
                <>
                  <rect x="6" y="2" width="12" height="20" rx="3" />
                  <path d="M10 18h4" />
                </>
              }
            >
              rekap sesi jadi gambar ukuran story. pamer tipis-tipis, tanpa harus screenshot.
            </Feature>
          </div>
        </section>

        {/* filosofi */}
        <section id="filosofi" className={`${container} scroll-mt-4 pb-24 pt-12`}>
          <div className="flex flex-wrap items-center gap-12 rounded-[28px] border border-spot-line bg-spot-panel p-7 md:p-16">
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
              <span className="font-mono text-[13px] text-spot-muted">kenapa namanya spot.</span>
              <p className="text-[clamp(24px,3vw,34px)] font-semibold leading-snug tracking-[-0.03em]">
                spotter gak pernah ngangkatin beban kamu. dia cuma berdiri di belakang, merhatiin, dan siap kalau kamu
                butuh.
              </p>
              <p className="text-lg leading-relaxed text-spot-muted">spot. juga gitu. kamu yang kerja, kami yang jaga dan catat.</p>
            </div>
            <ul className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
              <Value title="selalu ada">setiap set tercatat, dari rep pertama sampai pr.</Value>
              <Value title="gak menghakimi">gagal rep itu data, bukan aib.</Value>
              <Value title="jujur sama angka">gak ada hype. progres kamu yang ngomong.</Value>
            </ul>
          </div>
        </section>

        {/* ajakan */}
        <section className={`${container} flex flex-col items-center gap-6 pb-24 text-center`}>
          <svg width="72" height="72" viewBox="0 0 56 56" aria-hidden="true">
            <polygon
              points="28,4 48.8,16 48.8,40 28,52 7.2,40 7.2,16"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <circle cx="28" cy="28" r="6.5" fill="#FF6B35" />
          </svg>
          <h2 className="text-[clamp(36px,5vw,60px)] font-extrabold leading-none tracking-[-0.05em]">
            set pertama kamu, aku yang catat.
          </h2>
          <a
            href={START}
            className="inline-flex min-h-[52px] items-center rounded-full bg-spot-orange px-7 font-semibold text-spot-bg hover:bg-spot-orange-dark"
          >
            mulai lewat telegram
          </a>
        </section>
      </main>

      <footer className="border-t border-spot-line">
        <div className={`${container} flex flex-wrap justify-between gap-3 py-7 font-mono text-[13px] text-spot-muted`}>
          <span>spot. — kamu angkat, aku jagain.</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}

function PlaneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

// tiruan chat bot di hero; teksnya sama dengan balasan bot yang asli (lib/copy.ts)
function ChatMock() {
  const me = "self-end rounded-[16px_16px_4px_16px] bg-spot-orange px-[13px] py-[9px] font-medium text-spot-bg";
  const bot = "self-start max-w-[85%] rounded-[16px_16px_16px_4px] bg-spot-chip px-[13px] py-[9px]";
  return (
    <figure
      aria-label="contoh percakapan dengan bot spot."
      className="flex w-[340px] max-w-full flex-col gap-2.5 rounded-[40px] border border-spot-line bg-spot-panel px-4 py-5 text-sm leading-snug"
    >
      <div className="flex items-center gap-2.5 border-b border-spot-line px-1 pb-3 pt-1">
        <div className="flex size-9 items-center justify-center rounded-[11px] bg-spot-bg">
          <svg width="20" height="20" viewBox="0 0 56 56" aria-hidden="true">
            <polygon points="28,4 48.8,16 48.8,40 28,52 7.2,40 7.2,16" fill="none" stroke="#F2F0EB" strokeWidth="7" strokeLinejoin="round" />
            <circle cx="28" cy="28" r="6.5" fill="#FF6B35" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">spot.</span>
          <span className="font-mono text-[11px] text-spot-muted">lagi jagain</span>
        </div>
      </div>
      <p className={me}>squat 100x5x5</p>
      <p className={bot}>kecatat. squat 100 kg × 5 × 5</p>
      <p className={`${bot} flex items-center gap-2`}>
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-spot-orange" />
        pr baru. naik 2,5 kg. mantap.
      </p>
      <p className={me}>/selesai</p>
      <div className={`${bot} flex w-[85%] flex-col gap-1 py-3`}>
        <span className="font-mono text-[11px] text-spot-muted">rekap sesi legs</span>
        <span className="text-3xl font-extrabold tracking-[-0.05em]">6.340 kg</span>
        <span>
          setara {formatCount(6340 / 3500)} gajah. <span className="text-spot-muted">gajahnya aman kok.</span>
        </span>
      </div>
    </figure>
  );
}

function SectionTitle({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="font-mono text-[13px] text-spot-muted">{eyebrow}</span>
      <h2 className="text-[clamp(34px,4.5vw,52px)] font-bold leading-[1.05] tracking-[-0.05em]">{children}</h2>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-3.5 rounded-[22px] border border-spot-line bg-spot-panel p-7">
      <span className="font-mono text-sm text-spot-orange">{n}</span>
      <span className="text-[22px] font-bold tracking-[-0.03em]">{title}</span>
      <div className="text-[15px] leading-relaxed text-spot-muted">{children}</div>
    </li>
  );
}

function Feature({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-spot-line p-7">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon}
      </svg>
      <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="text-[15px] leading-relaxed text-spot-muted">{children}</p>
    </div>
  );
}

function Value({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-1 rounded-2xl bg-spot-bg px-5 py-[18px]">
      <span className="text-[17px] font-semibold">{title}</span>
      <span className="text-sm text-spot-muted">{children}</span>
    </li>
  );
}
