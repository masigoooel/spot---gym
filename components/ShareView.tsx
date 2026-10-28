"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { chooseStoryItem, sendStoryToTelegram } from "@/app/bagikan/[sessionId]/actions";
import { Ilustrasi } from "@/components/Ilustrasi";
import { findItem, formatCount, ITEMS, type Item } from "@/lib/setara";
import { STORY_STYLES, storyQuery, type StoryStyle } from "@/lib/story-options";

type Props = { sessionId: string; meta: string; volume: number; itemId: Item["id"] | null; hasPr: boolean };

const GROUPS = ["ringan", "menengah", "berat"] as const;

const SWATCH: Record<StoryStyle, string> = {
  oranye: "bg-spot-orange",
  gelap: "bg-spot-panel border-2 border-spot-orange",
  kapur: "bg-spot-text",
};

export function ShareView({ sessionId, meta, volume, itemId: initialItem, hasPr }: Props) {
  const [style, setStyle] = useState<StoryStyle>("oranye");
  const [stats, setStats] = useState(true);
  const [pr, setPr] = useState(true);
  const [itemId, setItemId] = useState(initialItem);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [group, setGroup] = useState<(typeof GROUPS)[number]>(findItem(initialItem ?? "")?.group ?? "menengah");
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const src = `/api/story/${sessionId}?${storyQuery({ style, stats, pr })}&v=${version}`;
  const item = itemId ? findItem(itemId) : null;
  const count = (i: Item) => formatCount(volume / i.kg);

  // gambar lama tetap tampil (agak redup) sampai yang baru selesai dimuat
  const update = (fn: () => void) => {
    setLoading(true);
    fn();
  };

  const choose = (choice: string) =>
    startTransition(async () => {
      const res = await chooseStoryItem(sessionId, choice);
      if (res.ok && res.itemId) {
        update(() => {
          setItemId(res.itemId as Item["id"]);
          setVersion((v) => v + 1);
        });
      } else setStatus(choice === "acak" ? "cuma itu yang pas buat volume segini." : "gagal ganti benda. coba lagi ya.");
    });

  const share = async () => {
    setStatus(null);
    const blob = await (await fetch(src)).blob();
    const file = new File([blob], "spot-story.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "spot." }).catch(() => {});
      return;
    }
    // laptop biasanya tidak bisa langsung bagikan file: unduh saja
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "spot-story.png";
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("perangkat ini gak bisa langsung bagikan. gambarnya aku unduhin, tinggal pasang di story.");
  };

  const sendTelegram = () =>
    startTransition(async () => {
      setStatus("lagi ngirim…");
      const res = await sendStoryToTelegram(sessionId, { style, stats, pr }).catch(() => ({ ok: false }));
      setStatus(res.ok ? "udah dikirim ke telegram." : "gagal ngirim ke telegram. coba lagi ya.");
    });

  return (
    <section
      aria-labelledby="judul-bagikan"
      className="flex w-full max-w-[1040px] flex-wrap gap-9 rounded-[28px] border border-spot-line bg-spot-panel p-5 md:p-9"
    >
      {/* pratinjau */}
      <div className="flex flex-[1_1_300px] flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- gambar dinamis dari route sendiri */}
        <img
          src={src}
          alt={`kartu story: ${meta}${item ? `, setara ${count(item)} ${item.label}` : ""}`}
          width={300}
          height={533}
          onLoad={() => setLoading(false)}
          className={`aspect-[9/16] w-full max-w-[300px] rounded-[22px] border border-spot-line bg-spot-bg transition-opacity ${
            loading ? "opacity-60" : ""
          }`}
        />
        <span className="font-mono text-xs text-spot-muted">pratinjau · 1080 × 1920</span>
      </div>

      {/* pilihan */}
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[13px] text-spot-muted">{meta}</span>
            <h1 id="judul-bagikan" className="text-[30px] font-bold tracking-[-0.04em]">
              bagikan ke story
            </h1>
          </div>
          <Link
            href={`/dashboard/riwayat/${sessionId}`}
            aria-label="tutup"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-spot-line-strong hover:border-spot-text"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm font-semibold">gaya kartu</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(STORY_STYLES) as StoryStyle[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={style === k}
                onClick={() => update(() => setStyle(k))}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 bg-spot-bg px-2.5 py-3.5 text-[13px] font-medium ${
                  style === k ? "border-spot-orange" : "border-spot-line"
                }`}
              >
                <span aria-hidden="true" className={`size-7 rounded-lg ${SWATCH[k]}`} />
                {STORY_STYLES[k].label}
              </button>
            ))}
          </div>
        </fieldset>

        {item ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">dibandingin sama</span>
              <div role="group" aria-label="mode perbandingan" className="flex rounded-full border border-spot-line bg-spot-bg p-[3px]">
                {(["auto", "manual"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={`min-h-9 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium ${
                      mode === m ? "bg-spot-text text-spot-bg" : "text-spot-muted"
                    }`}
                  >
                    {m === "auto" ? "otomatis" : "pilih sendiri"}
                  </button>
                ))}
              </div>
            </div>

            {mode === "auto" ? (
              <div className="flex items-center gap-3.5 rounded-2xl border border-spot-line bg-spot-bg p-3">
                <div className="w-24 shrink-0">
                  <Ilustrasi item={item.id} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">
                    {count(item)} {item.label}
                  </span>
                  <span className="text-xs leading-snug text-spot-muted">
                    spot. milih benda yang angkanya paling kebayang buat sesi ini.
                  </span>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => choose("acak")}
                  aria-label="acak benda lain"
                  className="min-h-11 shrink-0 rounded-full border border-spot-line-strong px-3.5 text-[13px] font-medium disabled:opacity-50"
                >
                  acak
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div role="tablist" aria-label="kelompok berat" className="flex gap-[18px] border-b border-spot-line">
                  {GROUPS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      role="tab"
                      aria-selected={group === g}
                      onClick={() => setGroup(g)}
                      className={`-mb-px min-h-11 border-b-2 px-0.5 text-sm font-medium ${
                        group === g ? "border-spot-orange text-spot-text" : "border-transparent text-spot-muted"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div role="tabpanel" className="grid grid-cols-3 gap-2">
                  {ITEMS.filter((i) => i.group === group).map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      aria-pressed={i.id === item.id}
                      disabled={pending}
                      onClick={() => choose(i.id)}
                      className={`flex flex-col gap-1 rounded-[14px] border-2 bg-spot-bg px-2 pb-2.5 pt-2 text-left ${
                        i.id === item.id ? "border-spot-orange" : "border-spot-line"
                      }`}
                    >
                      <Ilustrasi item={i.id} />
                      <span className="text-xs font-semibold">{i.label}</span>
                      <span className="font-mono text-[10px] opacity-70">× {count(i)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-spot-muted">sesi ini berat badan semua, jadi gak ada benda pembanding.</p>
        )}

        <div className="flex flex-col">
          <Toggle label="tampilkan set, durasi, streak" on={stats} onChange={(v) => update(() => setStats(v))} />
          {hasPr && <Toggle label="tampilkan pr baru" on={pr} onChange={(v) => update(() => setPr(v))} />}
        </div>

        <div className="mt-auto flex flex-col gap-2.5">
          <button
            type="button"
            onClick={share}
            className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-spot-orange text-[15px] font-semibold text-spot-bg hover:bg-spot-orange-dark"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
            </svg>
            bagikan ke story instagram
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={src}
              download="spot-story.png"
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-spot-line-strong text-sm font-medium hover:border-spot-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
              </svg>
              simpan gambar
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={sendTelegram}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-spot-line-strong text-sm font-medium hover:border-spot-text disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
              kirim ke telegram
            </button>
          </div>
          <p role="status" aria-live="polite" className="min-h-5 text-center text-[13px] text-spot-muted">
            {status}
          </p>
        </div>
      </div>
    </section>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-spot-line py-3">
      <span className="text-[15px]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${on ? "bg-spot-orange" : "bg-spot-line-strong"}`}
      >
        <span className={`absolute top-1 size-6 rounded-full bg-spot-bg transition-[left] ${on ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
