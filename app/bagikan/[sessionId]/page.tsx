import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ShareView } from "@/components/ShareView";
import { getCurrentUser } from "@/lib/auth";
import { getStoryData } from "@/lib/story";

export const metadata: Metadata = { title: "bagikan ke story · spot." };

export default function BagikanPage({ params }: PageProps<"/bagikan/[sessionId]">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-6 md:p-12">
      <Suspense fallback={<p className="text-spot-muted" role="status">lagi nyiapin kartunya…</p>}>
        <Share params={params} />
      </Suspense>
    </main>
  );
}

async function Share({ params }: Pick<PageProps<"/bagikan/[sessionId]">, "params">) {
  await connection();
  const { sessionId } = await params;
  const user = await getCurrentUser();
  const data = await getStoryData(user.id, sessionId);
  if (!data) notFound();

  return (
    <ShareView
      sessionId={sessionId}
      meta={data.split ? `sesi ${data.split} · ${data.dateLabel}` : data.dateLabel}
      volume={data.volume}
      itemId={data.setara?.id ?? null}
      hasPr={data.pr !== null}
    />
  );
}
