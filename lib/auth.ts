// data access layer: satu-satunya jalan untuk tahu siapa yang sedang login.
// membaca cookie, jadi komponen pemanggilnya wajib ada di dalam <Suspense>.
import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export type CurrentUser = { id: string; displayName: string | null; username: string | null };

// untuk server action & route handler: baca ulang cookie di setiap panggilan,
// jangan percaya apa pun yang dikirim dari browser
export async function requireUserId(): Promise<string> {
  const { userId } = await getSession();
  if (!userId) redirect("/masuk");
  return userId;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  // private: boleh baca cookies() dan cek kedaluwarsa sesi (Date.now) di dalam cache,
  // hasilnya tidak pernah disimpan di server
  "use cache: private";

  const { userId } = await getSession();
  if (!userId) redirect("/masuk");

  const { data, error } = await db()
    .from("users")
    .select("id, display_name, username")
    .eq("id", userId)
    .maybeSingle<{ id: string; display_name: string | null; username: string | null }>();
  if (error) throw new Error(error.message);
  if (!data) redirect("/masuk");

  return { id: data.id, displayName: data.display_name, username: data.username };
}
