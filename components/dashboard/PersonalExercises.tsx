"use client";

import { useState, useTransition } from "react";
import { deletePersonal, mergeExercise, renameExercise } from "@/app/dashboard/profil/actions";

type Personal = { id: number; name: string; muscle: string; equipment: string; setCount: number };

// latihan pribadi (dibuat lewat bot): ganti nama, gabung ke latihan bawaan, atau hapus
export function PersonalExercises({ items, targets }: { items: Personal[]; targets: { id: number; name: string }[] }) {
  if (items.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-spot-muted">
        belum ada. latihan yang belum aku kenal dan kamu kasih nama sendiri bakal muncul di sini.
      </p>
    );
  }
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <PersonalRow key={item.id} item={item} targets={targets} />
      ))}
    </ul>
  );
}

function PersonalRow({ item, targets }: { item: Personal; targets: { id: number; name: string }[] }) {
  const [name, setName] = useState(item.name);
  const [target, setTarget] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [merged, setMerged] = useState(false);
  const [pending, startTransition] = useTransition();

  if (merged) {
    return <li className="border-t border-spot-line py-3.5 text-sm text-spot-muted first:border-t-0">{status}</li>;
  }

  return (
    <li className="flex flex-col gap-2.5 border-t border-spot-line py-3.5 first:border-t-0">
      <span className="font-mono text-xs text-spot-muted">
        {item.muscle} · {item.equipment} · {item.setCount} set
      </span>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await renameExercise(item.id, name).catch(() => ({ ok: false, error: undefined }));
            setStatus(res.ok ? "nama tersimpan." : (res.error ?? "gagal nyimpen. coba lagi ya."));
          });
        }}
      >
        <label htmlFor={`nama-${item.id}`} className="sr-only">
          nama latihan
        </label>
        <input
          id={`nama-${item.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="min-h-11 flex-[1_1_180px] rounded-xl border border-spot-line-strong bg-spot-chip px-3 text-sm"
        />
        <button
          type="submit"
          disabled={pending || name.trim() === item.name}
          className="min-h-11 rounded-full border border-spot-line-strong px-4 text-sm font-medium disabled:opacity-40"
        >
          ganti nama
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <label htmlFor={`gabung-${item.id}`} className="sr-only">
          gabung ke latihan
        </label>
        <select
          id={`gabung-${item.id}`}
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            setConfirming(false);
            setDeleting(false);
          }}
          className="min-h-11 flex-[1_1_180px] rounded-xl border border-spot-line-strong bg-spot-chip px-3 text-sm"
        >
          <option value="">gabung ke latihan…</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!target || pending}
          onClick={() => {
            if (!confirming) {
              setConfirming(true);
              return;
            }
            startTransition(async () => {
              const res = await mergeExercise(item.id, Number(target)).catch(() => ({ ok: false }));
              const targetName = targets.find((t) => t.id === Number(target))?.name;
              if (res.ok) {
                setStatus(`${item.name} udah digabung ke ${targetName}. set dan rekornya ikut pindah.`);
                setMerged(true);
              } else setStatus("gagal gabung. coba lagi ya.");
            });
          }}
          className={`min-h-11 rounded-full px-4 text-sm font-semibold disabled:opacity-40 ${
            confirming ? "bg-spot-orange text-spot-bg" : "border border-spot-line-strong"
          }`}
        >
          {confirming ? "yakin, gabung" : "gabung"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!deleting) {
              setDeleting(true);
              setConfirming(false);
              return;
            }
            startTransition(async () => {
              const res = await deletePersonal(item.id).catch(() => ({ ok: false }));
              if (res.ok) {
                setStatus(`${item.name} dihapus. set-setnya sekarang ada di latihan lain.`);
                setMerged(true);
              } else setStatus("gagal hapus. coba lagi ya.");
            });
          }}
          className={`min-h-11 rounded-full px-4 text-sm font-semibold disabled:opacity-40 ${
            deleting
              ? "bg-spot-danger text-spot-bg"
              : "border border-spot-danger-soft text-spot-danger-soft hover:bg-spot-danger-bg"
          }`}
        >
          {deleting ? "ya, hapus" : "hapus latihan"}
        </button>
        {deleting && (
          <button
            type="button"
            onClick={() => setDeleting(false)}
            className="min-h-11 rounded-full px-4 text-sm text-spot-muted hover:text-spot-text"
          >
            gak jadi
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className="text-[13px] text-spot-muted">
        {deleting && !pending
          ? `yakin hapus ${item.name}? ${item.setCount} set-nya pindah ke "latihan lain" dan rekornya ikut hilang.`
          : confirming && !pending
            ? `${item.setCount} set ${item.name} bakal dipindah. gak bisa dibatalin.`
            : status}
      </p>
    </li>
  );
}
