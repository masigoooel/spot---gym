import { Suspense } from "react";
import { DeleteAccount } from "@/components/dashboard/DeleteAccount";
import { PersonalExercises } from "@/components/dashboard/PersonalExercises";
import { ProfilForm } from "@/components/dashboard/ProfilForm";
import { TemplateEditor } from "@/components/dashboard/TemplateEditor";
import { LoadingPage } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { getProfil } from "@/lib/dashboard";
import { formatNumber } from "@/lib/format";
import { logout } from "../actions";

export default function ProfilPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <ProfilView />
    </Suspense>
  );
}

async function ProfilView() {
  const user = await getCurrentUser();
  const d = await getProfil(user.id);
  const initials = d.name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toLowerCase() || "sp";

  return (
    <main className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-4 pb-12 pt-6 md:px-10 md:pt-8">
      <header className="flex flex-wrap items-center gap-5">
        <div
          aria-hidden="true"
          className="flex size-20 items-center justify-center rounded-3xl bg-spot-orange text-4xl font-extrabold tracking-[-0.04em] text-spot-bg"
        >
          {initials}
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[34px] font-bold tracking-[-0.04em]">{d.name}</h1>
          <span className="font-mono text-[13px] text-spot-muted">
            gabung {d.joinedLabel} · {formatNumber(d.sessionCount)} sesi · {formatNumber(d.setCount)} set
          </span>
        </div>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-spot-line bg-spot-panel p-5 md:p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-[14px] bg-spot-bg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold">telegram tersambung</span>
            <span className="font-mono text-[13px] text-spot-muted">{d.username ? `@${d.username}` : "tanpa username"}</span>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[13px] text-spot-orange">
          <span aria-hidden="true" className="size-2 rounded-full bg-spot-orange" />
          aktif
        </span>
      </section>

      <ProfilForm initial={d.settings} exampleVolume={d.exampleVolume} />

      <section className="flex flex-col gap-3 rounded-[22px] border border-spot-line bg-spot-panel p-5 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-[-0.02em]">template latihan per split</h2>
          <p className="text-[13px] text-spot-muted">latihan yang ditawarin bot pas sesi jalan, urut dari atas.</p>
        </div>
        {/* key: ganti program → daftar split berubah, editor dibuat ulang */}
        <TemplateEditor
          key={`${d.settings.program}:${d.templates.map((t) => `${t.split}${t.exerciseIds.join(",")}`).join("|")}`}
          templates={d.templates}
          options={d.exerciseOptions}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-[22px] border border-spot-line bg-spot-panel p-5 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-[-0.02em]">latihan pribadi</h2>
          <p className="text-[13px] text-spot-muted">ganti nama, gabung ke latihan bawaan kalau ternyata sama, atau hapus.</p>
        </div>
        <PersonalExercises items={d.personal} targets={d.mergeTargets} />
      </section>

      <DeleteAccount />

      <div className="flex flex-wrap gap-2.5">
        <a
          href="/dashboard/profil/ekspor"
          download
          className="flex min-h-11 items-center rounded-full border border-spot-line-strong px-[18px] text-sm font-medium hover:border-spot-text"
        >
          ekspor data (csv)
        </a>
        <form action={logout}>
          <button type="submit" className="min-h-11 rounded-full px-[18px] text-sm text-spot-muted hover:text-spot-text">
            keluar
          </button>
        </form>
      </div>
    </main>
  );
}
