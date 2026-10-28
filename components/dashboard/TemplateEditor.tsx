"use client";

import { useState, useTransition } from "react";
import { resetTemplate, saveTemplate } from "@/app/dashboard/profil/actions";
import { searchExercises } from "@/lib/exercise-match";

type Template = { split: string; custom: boolean; exerciseIds: number[] };
type Option = { id: number; slug: string; name: string; aliases: string[]; muscle: string };

// latihan yang ditawarkan bot per split: urutkan, hapus, tambah, atau kembali ke bawaan
export function TemplateEditor({ templates, options }: { templates: Template[]; options: Option[] }) {
  const [active, setActive] = useState(templates[0]?.split);
  const [state, setState] = useState(templates);
  const [adding, setAdding] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const byId = new Map(options.map((o) => [o.id, o]));

  if (templates.length === 0) {
    return <p className="text-[13px] text-spot-muted">program bebas gak pakai template. bot nawarin latihan yang paling sering kamu kerjain.</p>;
  }

  const current = state.find((t) => t.split === active)!;
  // kolom cari pakai normalisasi yang sama dengan bot (sinonim, jamak, urutan kata bebas)
  const shown = searchExercises(query, options).filter((o) => !current.exerciseIds.includes(o.id));
  const update = (ids: number[]) => {
    const before = state;
    setState(state.map((t) => (t.split === active ? { ...t, exerciseIds: ids, custom: true } : t)));
    startTransition(async () => {
      const res = await saveTemplate(active!, ids).catch(() => ({ ok: false }));
      setStatus(res.ok ? "tersimpan." : "gagal nyimpen. coba lagi ya.");
      if (!res.ok) setState(before);
    });
  };
  const move = (i: number, by: number) => {
    const ids = [...current.exerciseIds];
    [ids[i], ids[i + by]] = [ids[i + by], ids[i]];
    update(ids);
  };

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="split" className="flex gap-[18px] overflow-x-auto border-b border-spot-line">
        {state.map((t) => (
          <button
            key={t.split}
            type="button"
            role="tab"
            aria-selected={t.split === active}
            onClick={() => setActive(t.split)}
            className={`-mb-px min-h-11 border-b-2 px-0.5 text-sm font-medium ${
              t.split === active ? "border-spot-orange text-spot-text" : "border-transparent text-spot-muted"
            }`}
          >
            {t.split}
          </button>
        ))}
      </div>

      <ol role="tabpanel" className="flex flex-col gap-1.5">
        {current.exerciseIds.map((id, i) => (
          <li key={id} className="flex items-center gap-2 rounded-xl bg-spot-bg py-1.5 pl-3.5 pr-1.5">
            <span className="w-5 font-mono text-xs text-spot-muted">{i + 1}</span>
            <span className="flex-1 text-[15px]">{byId.get(id)?.name ?? "?"}</span>
            <IconButton label={`naikkan ${byId.get(id)?.name}`} disabled={pending || i === 0} onClick={() => move(i, -1)}>
              ↑
            </IconButton>
            <IconButton
              label={`turunkan ${byId.get(id)?.name}`}
              disabled={pending || i === current.exerciseIds.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </IconButton>
            <IconButton
              label={`hapus ${byId.get(id)?.name}`}
              disabled={pending}
              onClick={() => update(current.exerciseIds.filter((x) => x !== id))}
            >
              ✕
            </IconButton>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`cari-${active}`} className="sr-only">
          cari latihan
        </label>
        <input
          id={`cari-${active}`}
          type="search"
          value={query}
          placeholder="cari latihan… (misal dumbbell row)"
          onChange={(e) => {
            setQuery(e.target.value);
            setAdding("");
          }}
          className="min-h-11 flex-[1_1_200px] rounded-xl border border-spot-line-strong bg-spot-chip px-3 text-sm placeholder:text-spot-muted"
        />
        <label htmlFor={`tambah-${active}`} className="sr-only">
          tambah latihan ke {active}
        </label>
        <select
          id={`tambah-${active}`}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          className="min-h-11 flex-[1_1_200px] rounded-xl border border-spot-line-strong bg-spot-chip px-3 text-sm"
        >
          <option value="">{query.trim() ? `${shown.length} latihan cocok…` : "tambah latihan…"}</option>
          {shown
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} · {o.muscle}
              </option>
            ))}
        </select>
        <button
          type="button"
          disabled={!adding || pending}
          onClick={() => {
            update([...current.exerciseIds, Number(adding)]);
            setAdding("");
          }}
          className="min-h-11 rounded-full border border-spot-line-strong px-4 text-sm font-medium disabled:opacity-40"
        >
          tambah
        </button>
        {current.custom && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await resetTemplate(active!).catch(() => ({ ok: false }));
                setStatus(res.ok ? "balik ke bawaan. muat ulang halaman buat lihat urutannya." : "gagal. coba lagi ya.");
              })
            }
            className="min-h-11 rounded-full px-4 text-sm text-spot-muted hover:text-spot-text"
          >
            kembalikan bawaan
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-[13px] text-spot-muted">
        {status}
      </p>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-lg text-spot-muted hover:bg-spot-raised hover:text-spot-text disabled:opacity-30"
    >
      {children}
    </button>
  );
}
