"use client";

// edit & hapus di riwayat (SPEC §7): tiap set bisa diedit/dihapus, sesi bisa dihapus.
// konfirmasi selalu menyebut apa yang dihapus + akibatnya (pr yang hilang),
// lalu toast "… dihapus · urungkan" selama 10 detik.

import { useRouter } from "next/navigation";
// state yang diubah setelah `await` dibungkus startTransition supaya muncul bersamaan dengan data baru dari refresh()
import { startTransition as later, useEffect, useId, useRef, useState, useTransition } from "react";
import { deleteSession, deleteSet, restoreSession, restoreSet, updateSet } from "@/app/dashboard/riwayat/actions";
import { formatKg, formatNumber, type Unit } from "@/lib/format";

const TOAST_MS = 10_000;

export type SetItem = {
  id: string;
  order: number;
  chip: string;
  kind: "beban" | "durasi" | "kardio";
  weight: number | null; // satuan user
  isAdded: boolean;
  reps: number | null;
  failed: boolean;
  durationSec: number | null;
  distanceM: number | null;
  isPr: boolean;
  prAfterKg: number | null;
};

export type ExerciseItem = { name: string; volume: number; pr: boolean; note: string | null; sets: SetItem[] };

const prLine = (name: string, afterKg: number | null, unit: Unit) =>
  afterKg === null ? `${name} belum punya catatan beban lagi.` : `pr ${name} balik ke ${formatKg(afterKg, unit)}.`;

// ---------- daftar latihan + set di detail sesi ----------

export function SessionSets({ exercises, unit }: { exercises: ExerciseItem[]; unit: Unit }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ set: SetItem; name: string } | null>(null);
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const label = (set: SetItem, name: string) => `set ${set.order} · ${name} ${set.chip}`;

  return (
    <>
      <ul>
        {exercises.map((e) => {
          const open = e.sets.find((s) => s.id === openId);
          return (
            <li key={e.name} className="flex flex-col gap-3 border-t border-spot-line py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-[1_1_180px] flex-col gap-1">
                  <span className="flex items-center gap-2 text-base font-semibold">
                    {e.name}
                    {e.pr && (
                      <span className="rounded-full bg-spot-orange px-2 py-0.5 font-mono text-[11px] font-medium text-spot-bg">pr</span>
                    )}
                  </span>
                  {e.note && <span className="text-[13px] text-spot-muted">{e.note}</span>}
                </div>
                <div className="flex flex-[2_1_260px] flex-wrap gap-1.5">
                  {e.sets.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-expanded={openId === s.id}
                      aria-label={`ubah atau hapus ${label(s, e.name)}`}
                      onClick={() => setOpenId(openId === s.id ? null : s.id)}
                      className={`min-h-9 rounded-lg px-2.5 py-1.5 font-mono text-[13px] transition-colors ${
                        openId === s.id
                          ? "bg-spot-text text-spot-bg"
                          : "bg-spot-chip hover:bg-spot-line-strong"
                      }`}
                    >
                      {s.chip}
                    </button>
                  ))}
                </div>
                <span className="min-w-[90px] text-right text-[15px] font-semibold">
                  {e.volume > 0 ? formatKg(e.volume, unit) : "—"}
                </span>
              </div>
              {open && (
                <SetEditor
                  key={open.id}
                  set={open}
                  title={label(open, e.name)}
                  unit={unit}
                  onClose={() => setOpenId(null)}
                  onDelete={() => setConfirm({ set: open, name: e.name })}
                />
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={!!confirm}
        title={confirm ? `yakin hapus ${label(confirm.set, confirm.name)}?` : ""}
        body={
          confirm?.set.isPr
            ? `ini pr kamu. kalau dihapus, ${prLine(confirm.name, confirm.set.prAfterKg, unit)}`
            : "volume sesinya ikut dihitung ulang."
        }
        pending={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          const { set, name } = confirm;
          startTransition(async () => {
            const res = await deleteSet(set.id).catch(() => ({ ok: false }));
            later(() => {
              setConfirm(null);
              setOpenId(null);
              setToast(
                res.ok
                  ? { id: set.id, text: `set ${set.order} · ${name} dihapus.` }
                  : { id: "", text: "gagal hapus. coba lagi ya." },
              );
            });
          });
        }}
      />

      {toast && (
        <Toast
          key={toast.id + toast.text}
          text={toast.text}
          onUndo={
            toast.id
              ? async () => {
                  const res = await restoreSet(toast.id).catch(() => ({ ok: false }));
                  later(() =>
                    setToast(res.ok ? { id: "", text: "set-nya balik lagi." } : { id: "", text: "udah gak bisa diurungkan." }),
                  );
                }
              : undefined
          }
          onDone={() => setToast(null)}
        />
      )}
    </>
  );
}

// ---------- form ubah satu set ----------

function SetEditor({
  set,
  title,
  unit,
  onClose,
  onDelete,
}: {
  set: SetItem;
  title: string;
  unit: Unit;
  onClose: () => void;
  onDelete: () => void;
}) {
  const id = useId();
  const timed = set.reps === null;
  const cardio = set.kind === "kardio";
  const [weight, setWeight] = useState(set.weight === null ? "" : String(set.weight));
  const [reps, setReps] = useState(set.reps === null ? "" : String(set.reps));
  const [failed, setFailed] = useState(set.failed);
  // kardio diketik dalam menit, durasi (plank) dalam detik
  const [duration, setDuration] = useState(
    set.durationSec === null ? "" : cardio ? String(Math.round((set.durationSec / 60) * 10) / 10) : String(set.durationSec),
  );
  const [km, setKm] = useState(set.distanceM === null ? "" : String(set.distanceM / 1000));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parse = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  return (
    <form
      aria-label={`ubah ${title}`}
      className="flex flex-col gap-3 rounded-[16px] bg-spot-bg p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const dur = parse(duration);
        const input = timed
          ? { durationSec: dur === null ? null : Math.round(cardio ? dur * 60 : dur), distanceKm: parse(km) }
          : { weight: parse(weight), reps: parse(reps), failed };
        startTransition(async () => {
          const res = await updateSet(set.id, input).catch(() => ({ ok: false, error: undefined }));
          later(() => {
            if (res.ok) onClose();
            else setError(res.error ?? "gagal nyimpen. coba lagi ya.");
          });
        });
      }}
    >
      <span className="font-mono text-xs text-spot-muted">{title}</span>
      <div className="flex flex-wrap gap-3">
        {timed ? (
          <>
            <Field id={`${id}-dur`} label={cardio ? "menit" : "detik"} value={duration} onChange={setDuration} />
            {cardio && <Field id={`${id}-km`} label="km (opsional)" value={km} onChange={setKm} />}
          </>
        ) : (
          <>
            <Field
              id={`${id}-w`}
              label={`${set.isAdded ? "beban tambahan" : "beban"} (${unit})`}
              placeholder="berat badan"
              value={weight}
              onChange={setWeight}
            />
            <Field id={`${id}-r`} label="rep" value={reps} onChange={setReps} />
            <label className="flex min-h-11 items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={failed}
                onChange={(e) => setFailed(e.target.checked)}
                className="size-4 accent-[var(--spot-orange)]"
              />
              rep terakhir gagal
            </label>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-full bg-spot-orange px-[18px] text-sm font-semibold text-spot-bg disabled:opacity-50"
        >
          simpan
        </button>
        <button type="button" onClick={onClose} className="min-h-11 rounded-full px-4 text-sm text-spot-muted hover:text-spot-text">
          batal
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto min-h-11 rounded-full border border-spot-danger-soft px-4 text-sm font-medium text-spot-danger-soft hover:bg-spot-danger-bg"
        >
          hapus set
        </button>
      </div>
      <p role="status" aria-live="polite" className="text-[13px] text-spot-danger-soft empty:hidden">
        {error}
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex w-[130px] flex-col gap-1">
      <label htmlFor={id} className="font-mono text-[11px] text-spot-muted">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-xl border border-spot-line-strong bg-spot-chip px-3 font-mono text-sm placeholder:text-spot-muted"
      />
    </div>
  );
}

// ---------- hapus sesi ----------

export function DeleteSessionButton({
  sessionId,
  label,
  setCount,
  volume,
  prLost,
  unit,
}: {
  sessionId: string;
  label: string;
  setCount: number;
  volume: number;
  prLost: { name: string; prAfterKg: number | null }[];
  unit: Unit;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lost = prLost.map((p) => prLine(p.name, p.prAfterKg, unit)).join(" ");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-full border border-spot-danger-soft px-[18px] text-sm font-medium text-spot-danger-soft hover:bg-spot-danger-bg"
      >
        hapus sesi
      </button>
      <ConfirmDialog
        open={open}
        title={`yakin hapus ${label}?`}
        body={[
          `${formatNumber(setCount)} set${volume > 0 ? ` · ${formatKg(volume, unit)}` : ""} ikut kehapus semua.`,
          lost,
          error,
        ]
          .filter(Boolean)
          .join(" ")}
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteSession(sessionId).catch(() => ({ ok: false }));
            if (!res.ok) {
              setError("gagal hapus. coba lagi ya.");
              return;
            }
            setOpen(false);
            router.replace(`/dashboard/riwayat?dihapus=${sessionId}`);
            router.refresh();
          })
        }
      />
    </>
  );
}

// toast setelah sesi dihapus (halaman pindah ke daftar riwayat, id sesi dibawa di url)
export function SessionUndoToast({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [text, setText] = useState("sesinya dihapus.");
  const [undoable, setUndoable] = useState(true);
  return (
    <Toast
      text={text}
      onUndo={
        undoable
          ? async () => {
              const res = await restoreSession(sessionId).catch(() => ({ ok: false }));
              if (res.ok) {
                router.replace(`/dashboard/riwayat/${sessionId}`);
                router.refresh();
              } else {
                setText("udah gak bisa diurungkan.");
                setUndoable(false);
              }
            }
          : undefined
      }
      onDone={() => router.replace("/dashboard/riwayat", { scroll: false })}
    />
  );
}

// ---------- potongan umum ----------

function ConfirmDialog({
  open,
  title,
  body,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[22px] border border-spot-line-strong bg-spot-panel p-6 text-spot-text backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-3">
        <h2 id={titleId} className="text-lg font-bold leading-snug tracking-[-0.02em]">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-spot-soft">{body}</p>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full border border-spot-line-strong px-[18px] text-sm font-medium hover:border-spot-text"
          >
            gak jadi
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="min-h-11 rounded-full bg-spot-danger px-[18px] text-sm font-semibold text-spot-bg disabled:opacity-50"
          >
            {pending ? "menghapus…" : "ya, hapus"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Toast({ text, onUndo, onDone }: { text: string; onUndo?: () => Promise<void>; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const t = setTimeout(() => done.current(), TOAST_MS);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-[440px] items-center justify-between gap-3 rounded-2xl border border-spot-line-strong bg-spot-raised px-4 py-3 text-sm shadow-lg md:bottom-6"
    >
      <span>{text}</span>
      {onUndo && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(onUndo)}
          className="min-h-9 shrink-0 rounded-full px-3 font-semibold text-spot-orange hover:bg-spot-chip disabled:opacity-50"
        >
          urungkan
        </button>
      )}
    </div>
  );
}
