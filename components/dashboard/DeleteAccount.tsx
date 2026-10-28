"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAccount } from "@/app/dashboard/profil/actions";

// hapus akun: wajib ketik "hapus". akun & semua data dihapus permanen 7 hari lagi,
// sampai saat itu bisa dibatalkan lewat bot.
export function DeleteAccount() {
  const [text, setText] = useState("");
  const ready = text.trim().toLowerCase() === "hapus";

  return (
    <section className="flex flex-col gap-3 rounded-[22px] border border-spot-danger-bg bg-spot-panel p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold tracking-[-0.02em]">hapus akun</h2>
        <p className="text-[13px] leading-relaxed text-spot-muted">
          semua sesi, set, rekor, dan pengaturan kamu dihapus permanen 7 hari setelah ini. selama 7 hari itu kamu masih
          bisa urungkan lewat bot. mau nyimpen datanya dulu? ekspor csv di bawah.
        </p>
      </div>
      <form action={deleteAccount} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-[1_1_220px] flex-col gap-1">
          <label htmlFor="konfirmasi-hapus" className="font-mono text-[11px] text-spot-muted">
            ketik <span className="text-spot-danger-soft">hapus</span> buat lanjut
          </label>
          <input
            id="konfirmasi-hapus"
            name="konfirmasi"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-11 rounded-xl border border-spot-line-strong bg-spot-chip px-3 font-mono text-sm"
          />
        </div>
        <Submit ready={ready} />
      </form>
    </section>
  );
}

function Submit({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!ready || pending}
      className="min-h-11 rounded-full bg-spot-danger px-[18px] text-sm font-semibold text-spot-bg disabled:bg-transparent disabled:text-spot-danger-soft disabled:opacity-60 disabled:ring-1 disabled:ring-spot-danger-soft"
    >
      {pending ? "menghapus…" : "hapus akun"}
    </button>
  );
}
