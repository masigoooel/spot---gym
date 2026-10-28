// potongan ui dashboard yang dipakai berulang (mengikuti desain canvas spot.)

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[1220px] flex-col gap-5 px-4 pb-12 pt-6 md:px-10 md:pt-8">
      {children}
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[13px] text-spot-muted">{eyebrow}</span>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.04em] md:text-[34px]">{title}</h1>
      </div>
      {children}
    </header>
  );
}

export function Panel({
  className = "",
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement> & { className?: string }) {
  return (
    <section className={`min-w-0 rounded-[22px] border border-spot-line bg-spot-panel p-5 md:p-6 ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function PanelTitle({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-bold tracking-[-0.02em]">{children}</h2>
      {hint && <span className="text-[13px] text-spot-muted">{hint}</span>}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs text-spot-muted">{children}</span>;
}

// warna pil split: push oranye, legs kapur, sisanya garis (seperti di desain)
export function SplitPill({ split }: { split: string | null }) {
  const style =
    split === "push"
      ? "bg-spot-orange text-spot-bg"
      : split === "legs"
        ? "bg-spot-text text-spot-bg"
        : "border border-spot-line-strong text-spot-text";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>{split ?? "bebas"}</span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-spot-muted">{children}</p>;
}

// kerangka abu-abu saat data masih dimuat
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[22px] bg-spot-panel ${className}`} />;
}

export function LoadingPage() {
  return (
    <Page>
      <p className="sr-only" role="status">
        sebentar, lagi ambil data…
      </p>
      <Skeleton className="h-16 w-2/3" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-72" />
    </Page>
  );
}
