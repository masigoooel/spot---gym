// token link masuk dari bot (/masuk): acak, berlaku 10 menit, sekali pakai.
// yang disimpan di login_tokens cuma hash-nya, jadi isi tabel tidak bisa dipakai untuk masuk.
// dipakai bot (node biasa) dan route handler web, jadi tanpa `server-only`.

import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export const LOGIN_TOKEN_TTL_MS = 10 * 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createLoginToken(userId: string, now = new Date()): Promise<string> {
  const token = randomBytes(32).toString("base64url"); // 43 karakter

  // bersihkan token lama milik user ini yang sudah terpakai / kedaluwarsa
  const cleanup = await db()
    .from("login_tokens")
    .delete()
    .eq("user_id", userId)
    .or(`used_at.not.is.null,expires_at.lt."${now.toISOString()}"`);
  if (cleanup.error) throw new Error(cleanup.error.message);

  const { error } = await db()
    .from("login_tokens")
    .insert({
      token: hash(token),
      user_id: userId,
      expires_at: new Date(now.getTime() + LOGIN_TOKEN_TTL_MS).toISOString(),
    });
  if (error) throw new Error(error.message);
  return token;
}

// user_id pemilik token, atau null kalau token salah / sudah dipakai / kedaluwarsa
export async function consumeLoginToken(token: string, now = new Date()): Promise<string | null> {
  if (token.length < 32 || token.length > 128) return null;

  // satu update atomik: cuma bisa berhasil sekali, dan cuma sebelum kedaluwarsa
  const { data, error } = await db()
    .from("login_tokens")
    .update({ used_at: now.toISOString() })
    .eq("token", hash(token))
    .is("used_at", null)
    .gt("expires_at", now.toISOString())
    .select("user_id")
    .maybeSingle<{ user_id: string }>();
  if (error) throw new Error(error.message);
  return data?.user_id ?? null;
}
