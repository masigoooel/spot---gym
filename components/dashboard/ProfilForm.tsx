"use client";

import { useEffect, useState, useTransition } from "react";
import { saveSettings } from "@/app/dashboard/profil/actions";
import { Ilustrasi } from "@/components/Ilustrasi";
import { formatKg } from "@/lib/format";
import type { SettingsPatch, SettingsRow } from "@/lib/settings";
import { findItem, formatCount, ITEMS, pickSetara } from "@/lib/setara";

const DAYS = ["sen", "sel", "rab", "kam", "jum", "sab", "min"];
const SPLITS = ["push", "pull", "legs", "upper", "lower", "full", "bebas"];
const PROGRAMS = [
  { id: "ppl", label: "push pull legs" },
  { id: "upper_lower", label: "upper lower" },
  { id: "ppl_ul", label: "ppl + upper lower" },
  { id: "full_body", label: "full body" },
  { id: "bebas", label: "bebas" },
] as const;

const NOTIFS = [
  { key: "notify_pr", label: "notifikasi pr", desc: "kabarin begitu rekor pecah" },
  { key: "notify_weekly", label: "rekap mingguan", desc: "tiap minggu jam 8 malam, ringkas aja" },
  { key: "notify_schedule", label: "pengingat jadwal", desc: "kalau hari ini jadwal latihan, plus kabar kalau kemarin kelewat" },
  { key: "auto_story", label: "kartu story otomatis", desc: "dikirim tiap selesai sesi" },
] as const;

const pill = (on: boolean) =>
  `min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
    on ? "border-spot-orange bg-spot-orange text-spot-bg" : "border-spot-line-strong text-spot-soft hover:text-spot-text"
  }`;

export function ProfilForm({ initial, exampleVolume }: { initial: SettingsRow; exampleVolume: number }) {
  const [s, setS] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 2500);
    return () => clearTimeout(t);
  }, [status]);

  // langsung tampil di layar, lalu disimpan; kalau gagal dikembalikan
  const save = (patch: SettingsPatch) => {
    const before = s;
    setS({ ...s, ...patch });
    startTransition(async () => {
      const res: { ok: boolean; split_schedule?: SettingsRow["split_schedule"] } = await saveSettings(patch).catch(
        () => ({ ok: false }),
      );
      if (res.ok) {
        // ganti program menyusun ulang jadwal di server; tampilkan hasilnya
        if (res.split_schedule) setS((cur) => ({ ...cur, split_schedule: res.split_schedule! }));
        setStatus("tersimpan.");
      } else {
        setS(before);
        setStatus("gagal nyimpen. coba lagi ya.");
      }
    });
  };

  const setDay = (day: number, split: string) => {
    const schedule = { ...s.split_schedule };
    if (split) schedule[String(day)] = split;
    else delete schedule[String(day)];
    save({ split_schedule: schedule });
  };

  const example = pickSetara(exampleVolume, {
    mode: s.compare_mode,
    lockedId: s.compare_item,
    random: () => 0,
  });
  const locked = findItem(s.compare_item);

  return (
    <>
      <Section title="latihan">
        <Row label="program" hint="ganti program = split di hari latihanmu disusun ulang">
          <div role="group" aria-label="program" className="flex flex-wrap gap-1.5">
            {PROGRAMS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={s.program === p.id}
                onClick={() => s.program !== p.id && save({ program: p.id })}
                className={pill(s.program === p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Row>

        <Row label="target sesi per minggu" hint='dipakai buat bar "sesi minggu ini"'>
          <Stepper
            label="target"
            value={s.weekly_target}
            min={1}
            max={7}
            onChange={(v) => save({ weekly_target: v })}
          />
        </Row>

        <Row label="jatah libur per minggu" hint="libur sebanyak ini (lewat /libur) gak mutus streak">
          <Stepper
            label="jatah libur"
            value={s.rest_allowance}
            min={0}
            max={7}
            onChange={(v) => save({ rest_allowance: v })}
          />
        </Row>

        <Row label="satuan beban" hint="ngaruh ke angka yang kamu ketik di bot juga">
          <div role="group" aria-label="satuan" className="flex gap-1.5">
            {(["kg", "lb"] as const).map((u) => (
              <button key={u} type="button" aria-pressed={s.unit === u} onClick={() => save({ unit: u })} className={pill(s.unit === u)}>
                {u}
              </button>
            ))}
          </div>
        </Row>

        <Row label="jadwal split" hint="biar bot tau hari ini jadwal apa">
          <div className="grid w-full grid-cols-4 gap-1.5 sm:w-auto sm:grid-cols-7">
            {DAYS.map((day, i) => {
              const value = s.split_schedule[String(i + 1)] ?? "";
              const options = value && !SPLITS.includes(value) ? [value, ...SPLITS] : SPLITS;
              return (
                <label key={day} className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] text-spot-muted">{day}</span>
                  <select
                    value={value}
                    onChange={(e) => setDay(i + 1, e.target.value)}
                    className="min-h-11 rounded-lg border border-spot-line-strong bg-spot-chip px-1.5 font-mono text-xs"
                  >
                    <option value="">libur</option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </Row>
      </Section>

      <Section
        title="setara dengan"
        hint="benda pembanding di kartu rekap dan story. ada 14 pilihan, dari durian sampai paus biru."
      >
        <div role="group" aria-label="mode perbandingan" className="flex flex-wrap gap-2 pt-2">
          <button type="button" aria-pressed={s.compare_mode === "auto"} onClick={() => save({ compare_mode: "auto" })} className={pill(s.compare_mode === "auto")}>
            otomatis (disarankan)
          </button>
          <button type="button" aria-pressed={s.compare_mode === "lock"} onClick={() => save({ compare_mode: "lock" })} className={pill(s.compare_mode === "lock")}>
            kunci satu benda
          </button>
        </div>
        {s.compare_mode === "lock" && (
          <div className="mt-3 flex flex-wrap items-center gap-3.5 rounded-2xl border border-spot-line bg-spot-bg p-3">
            {locked && (
              <div className="w-24 shrink-0">
                <Ilustrasi item={locked.id} />
              </div>
            )}
            <label htmlFor="fav" className="text-sm text-spot-muted">
              selalu pakai
            </label>
            <select
              id="fav"
              value={s.compare_item}
              onChange={(e) => save({ compare_item: e.target.value })}
              className="min-h-11 flex-[1_1_180px] rounded-xl border border-spot-line-strong bg-spot-panel px-3 text-sm font-medium"
            >
              {ITEMS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {example && (
          <p className="mt-3 text-[15px]">
            contoh: {formatKg(exampleVolume, s.unit)} ={" "}
            <span className="font-semibold text-spot-orange">
              {formatCount(example.count)} {example.item.label}
            </span>
            {s.compare_mode === "auto" && <span className="text-spot-muted"> (dipilih otomatis)</span>}
          </p>
        )}
      </Section>

      <Section title="pesan dari bot">
        <Row label="tingkat cerewet" hint="seperlunya = tanpa pengingat jadwal & tanpa ditanya rasa. tombol tetap ada.">
          <div role="group" aria-label="tingkat cerewet" className="flex gap-1.5">
            {(["aktif", "seperlunya"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={s.chattiness === c}
                onClick={() => save({ chattiness: c })}
                className={pill(s.chattiness === c)}
              >
                {c}
              </button>
            ))}
          </div>
        </Row>
        <Row label="jam pengingat" hint='bot nanya "hari ini push. siap?" di jam ini'>
          <input
            type="time"
            aria-label="jam pengingat"
            value={s.reminder_time}
            onChange={(e) => setS({ ...s, reminder_time: e.target.value })}
            onBlur={(e) => e.target.value && save({ reminder_time: e.target.value })}
            className="min-h-11 rounded-xl border border-spot-line-strong bg-spot-chip px-3 font-mono text-sm [color-scheme:dark]"
          />
        </Row>
        {NOTIFS.map((n) => {
          const on = s[n.key];
          return (
            <Row key={n.key} label={n.label} hint={n.desc}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={n.label}
                onClick={() => save({ [n.key]: !on })}
                className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${on ? "bg-spot-orange" : "bg-spot-line-strong"}`}
              >
                <span
                  className={`absolute top-1 size-6 rounded-full bg-spot-bg transition-[left] ${on ? "left-6" : "left-1"}`}
                />
              </button>
            </Row>
          );
        })}
      </Section>

      <p
        role="status"
        aria-live="polite"
        className={`fixed bottom-4 right-4 z-20 rounded-full border border-spot-line-strong bg-spot-panel px-4 py-2 text-sm transition-opacity ${
          status ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {status}
      </p>
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-[22px] border border-spot-line bg-spot-panel p-5 md:p-6">
      <h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
      {hint && <p className="mt-1 text-[13px] text-spot-muted">{hint}</p>}
      <div className="mt-2 flex flex-col">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-spot-line py-3.5 first:border-t-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-medium">{label}</span>
        {hint && <span className="text-[13px] text-spot-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`kurangi ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="size-11 rounded-full border border-spot-line-strong text-xl disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-12 text-center text-[22px] font-bold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`tambah ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="size-11 rounded-full border border-spot-line-strong text-xl disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
