// sesi web: cookie terenkripsi (iron-session) berisi user_id
import "server-only";
import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

export const SESSION_COOKIE = "spot_sesi";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 hari

type SessionData = { userId?: string };

function password(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET minimal 32 karakter di .env.local");
  return secret;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TTL_SECONDS - 60,
} as const;

// isi cookie untuk user ini; dipasang oleh route handler
export function sealSession(userId: string): Promise<string> {
  return sealData({ userId } satisfies SessionData, { password: password(), ttl: TTL_SECONDS });
}

// cookie kosong, rusak, atau kedaluwarsa → {}
export async function getSession(): Promise<SessionData> {
  const sealed = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sealed) return {};
  return unsealData<SessionData>(sealed, { password: password(), ttl: TTL_SECONDS });
}

// hanya dari server action / route handler
export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
