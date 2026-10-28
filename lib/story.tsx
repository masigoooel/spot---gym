// kartu story 1080×1920 (next/og). dipakai route /api/story/[sessionId] dan bot (/selesai),
// jadi tanpa `server-only`. tata letak mengikuti artboard "Story" & "Share" di canvas desain,
// diperbesar 2× dari 540×960.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ilustrasiArt } from "@/components/Ilustrasi";
import { formatDay, formatDayLong, formatKg, type Unit } from "@/lib/format";
import {
  durationMinutes,
  getPrs,
  getSets,
  getSettings,
  getStreakInput,
  getWorkoutSession,
  sessionSetara,
} from "@/lib/queries";
import { formatCount, type Item } from "@/lib/setara";
import { DEFAULT_STORY, STORY_STYLES, type StoryOptions } from "@/lib/story-options";
import { streakDays } from "@/lib/workout";

export const STORY_SIZE = { width: 1080, height: 1920 } as const;

// ---------- data ----------

export type StoryData = {
  dateLabel: string; // `kamis, 22 okt`
  split: string | null;
  volume: number;
  unit: Unit;
  setara: { id: Item["id"]; label: string; quip: string; count: string } | null;
  setCount: number;
  minutes: number | null;
  streak: number;
  pr: { name: string; weightKg: number } | null;
};

export async function getStoryData(userId: string, sessionId: string): Promise<StoryData | null> {
  const settings = await getSettings(userId);
  const tz = settings.timezone;
  const session = await getWorkoutSession(userId, sessionId, tz);
  if (!session) return null;

  const [sets, streakInput] = await Promise.all([
    getSets(userId, tz, { sessionIds: [session.id] }),
    // streak per hari sesi itu, bukan hari ini
    getStreakInput(userId, settings, session.date),
  ]);
  const prs = await getPrs(userId, tz, { setIds: sets.map((s) => s.id) });
  const topPr = prs.sort((a, b) => b.weightKg - a.weightKg)[0];
  const setara = sessionSetara(session, settings);

  return {
    dateLabel: `${formatDayLong(session.startedAt, tz).split(",")[0]}, ${formatDay(session.startedAt, tz)}`,
    split: session.split,
    volume: session.volume,
    unit: settings.unit,
    setara: setara && {
      id: setara.item.id,
      label: setara.item.label,
      quip: setara.item.quip,
      count: formatCount(setara.count),
    },
    setCount: session.setCount,
    minutes: durationMinutes(session),
    streak: streakDays(streakInput),
    pr: topPr ? { name: topPr.name, weightKg: topPr.weightKg } : null,
  };
}

// ---------- gambar ----------

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600 | 700 | 800; style: "normal" }[]> | null = null;

function loadFonts() {
  const dir = join(process.cwd(), "assets", "fonts");
  const font = async (file: string, name: string, weight: 400 | 500 | 600 | 700 | 800) => ({
    name,
    data: await readFile(join(dir, file)),
    weight,
    style: "normal" as const,
  });
  fonts ??= Promise.all([
    font("Geist-Medium.ttf", "Geist", 500),
    font("Geist-SemiBold.ttf", "Geist", 600),
    font("Geist-Bold.ttf", "Geist", 700),
    font("Geist-Black.ttf", "Geist", 800), // paket geist tidak punya extrabold tegak
    font("GeistMono-Regular.ttf", "Geist Mono", 400),
    font("GeistMono-Medium.ttf", "Geist Mono", 500),
  ]);
  return fonts;
}

const MONO = "Geist Mono";
const INNER_WIDTH = 1080 - 2 * 80 - 2 * 64; // lebar teks di dalam blok besar

// angka volume mengecil kalau panjang, supaya `13.982,5 kg` tetap muat satu baris
function bigFontSize(text: string) {
  return Math.min(176, Math.floor(INNER_WIDTH / (text.length * 0.58)));
}

export async function storyImage(data: StoryData, options: StoryOptions = DEFAULT_STORY): Promise<ImageResponse> {
  const c = STORY_STYLES[options.style];
  const volume = formatKg(data.volume, data.unit);
  const meta = data.split ? `${data.dateLabel} · ${data.split}` : data.dateLabel;

  const card = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 40,
        padding: "112px 80px 96px",
        background: c.bg,
        color: c.ink,
        fontFamily: "Geist",
      }}
    >
      {/* logo + tanggal */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "flex-end", fontSize: 60, fontWeight: 800, letterSpacing: -3.6, lineHeight: 1 }}>
          <span>sp</span>
          <svg viewBox="3.5 0.5 49 55" width={30} height={34} style={{ margin: "0 1px 6px 4px" }}>
            <polygon points="28,4 48.8,16 48.8,40 28,52 7.2,40 7.2,16" fill="none" stroke={c.ink} strokeWidth={7} strokeLinejoin="round" />
            <circle cx="28" cy="28" r="6.5" fill="#FF6B35" />
          </svg>
          <span>t.</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 28, color: c.muted }}>{meta}</span>
      </div>

      {/* blok utama */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 28,
          padding: "72px 64px",
          borderRadius: 56,
          background: c.block,
          color: c.blockInk,
          border: `2px solid ${c.blockBorder}`,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 30 }}>total angkatan hari ini</span>
        <span style={{ fontSize: bigFontSize(volume), fontWeight: 800, letterSpacing: -6, lineHeight: 1, color: c.big }}>
          {volume}
        </span>

        {data.setara && (
          <div style={{ display: "flex", position: "relative", borderRadius: 40, padding: "36px 20px 12px", background: c.scene }}>
            <svg viewBox="0 0 240 130" width={INNER_WIDTH - 40} height={Math.round(((INNER_WIDTH - 40) * 130) / 240)}>
              {ilustrasiArt(data.setara.id)}
            </svg>
            <span
              style={{
                position: "absolute",
                top: 28,
                right: 28,
                fontFamily: MONO,
                fontSize: 36,
                fontWeight: 500,
                color: "#121212",
                background: "#FF6B35",
                padding: "8px 24px",
                borderRadius: 999,
              }}
            >
              × {data.setara.count}
            </span>
          </div>
        )}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
          <span style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1.1 }}>
            {data.setara ? `setara ${data.setara.count} ${data.setara.label}.` : "sesi berat badan."}
          </span>
          <span style={{ fontSize: 44, fontWeight: 500, opacity: 0.75 }}>
            {data.setara ? data.setara.quip : "gak masuk volume, tapi tetep dihitung."}
          </span>
        </div>
      </div>

      {options.stats && (
        <div style={{ display: "flex", gap: 20 }}>
          {[
            ["set", String(data.setCount)],
            ["durasi", data.minutes === null ? "–" : `${data.minutes}m`],
            ["streak", `${data.streak} hr`],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 32,
                borderRadius: 36,
                background: c.tile,
                border: `2px solid ${c.tileBorder}`,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 24, color: c.muted }}>{label}</span>
              <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2 }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {options.pr && data.pr && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "32px 36px",
            borderRadius: 36,
            border: `2px solid ${c.prBorder}`,
          }}
        >
          <span style={{ fontSize: 34, fontWeight: 600 }}>pr baru · {data.pr.name}</span>
          <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.5, color: c.accent }}>
            {formatKg(data.pr.weightKg, data.unit)}
          </span>
        </div>
      )}

      <span style={{ fontFamily: MONO, fontSize: 26, color: c.muted, textAlign: "center", justifyContent: "center" }}>
        dicatat oleh spot. — kamu angkat, aku jagain.
      </span>
    </div>
  );

  return new ImageResponse(card, { ...STORY_SIZE, fonts: await loadFonts() });
}

export async function storyPng(data: StoryData, options?: StoryOptions): Promise<Buffer> {
  const image = await storyImage(data, options);
  return Buffer.from(await image.arrayBuffer());
}
