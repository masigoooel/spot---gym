import { Suspense } from "react";
import { RiwayatView } from "@/components/dashboard/RiwayatView";
import { LoadingPage } from "@/components/dashboard/ui";

export default function RiwayatPage({ searchParams }: PageProps<"/dashboard/riwayat">) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Latest searchParams={searchParams} />
    </Suspense>
  );
}

async function Latest({ searchParams }: { searchParams: PageProps<"/dashboard/riwayat">["searchParams"] }) {
  const { minggu, dihapus } = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return <RiwayatView weeks={one(minggu)} deletedId={one(dihapus)} />;
}
