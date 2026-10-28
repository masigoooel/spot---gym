import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getStoryData, storyImage } from "@/lib/story";
import { parseStoryOptions } from "@/lib/story-options";

// gambar kartu story 1080×1920 untuk sesi milik user yang sedang login.
// ?gaya=oranye|gelap|kapur, ?statistik=0 dan ?pr=0 untuk menyembunyikan bagian itu.
export async function GET(request: NextRequest, { params }: RouteContext<"/api/story/[sessionId]">) {
  const { userId } = await getSession();
  if (!userId) return new Response("masuk dulu ya", { status: 401 });

  const { sessionId } = await params;
  const data = await getStoryData(userId, sessionId);
  if (!data) return new Response("sesinya gak ketemu", { status: 404 });

  const image = await storyImage(data, parseStoryOptions(request.nextUrl.searchParams));
  image.headers.set("Cache-Control", "private, no-store");
  return image;
}
