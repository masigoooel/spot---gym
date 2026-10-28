import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// klien supabase untuk server (route handler, server action, bot).
// pakai service role, jadi jangan pernah di-import dari komponen client.
// sengaja tanpa paket `server-only` karena bot (node biasa) juga memakai file ini.

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("lib/db.ts hanya boleh dipakai di server");
  }
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local");
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

type DbError = { message: string } | null;

// query tulis: cukup pastikan tidak error
export function run(res: { error: DbError }) {
  if (res.error) throw new Error(res.error.message);
}

// hasil yang pasti ada (single / daftar)
export function must<T>(res: { data: T | null; error: DbError }): T {
  run(res);
  if (res.data === null) throw new Error("data kosong dari supabase");
  return res.data;
}

// hasil yang boleh tidak ada (maybeSingle)
export function maybe<T>(res: { data: T | null; error: DbError }): T | null {
  run(res);
  return res.data;
}

const PAGE = 1000; // batas baris per request bawaan supabase

// ambil semua baris, halaman demi halaman. query wajib punya urutan yang stabil.
export async function all<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: DbError }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const batch = must(await page(from, from + PAGE - 1));
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
}
