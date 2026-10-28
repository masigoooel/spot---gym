import { Suspense } from "react";
import { RiwayatView } from "@/components/dashboard/RiwayatView";
import { LoadingPage } from "@/components/dashboard/ui";

export default function SesiPage({ params, searchParams }: PageProps<"/dashboard/riwayat/[id]">) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Selected params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Selected({
  params,
  searchParams,
}: Pick<PageProps<"/dashboard/riwayat/[id]">, "params" | "searchParams">) {
  const [{ id }, { minggu }] = await Promise.all([params, searchParams]);
  return <RiwayatView selectedId={id} weeks={Array.isArray(minggu) ? minggu[0] : minggu} />;
}
