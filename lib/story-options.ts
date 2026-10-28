// pilihan tampilan kartu story. terpisah dari lib/story.tsx supaya bisa dipakai di
// komponen browser (halaman bagikan) tanpa ikut memuat next/og dan fs.

export const STORY_STYLES = {
  oranye: { label: "oranye", bg: "#121212", ink: "#F2F0EB", muted: "#9C9A93", block: "#FF6B35", blockInk: "#121212", blockBorder: "#FF6B35", big: "#121212", tile: "#1B1B1A", tileBorder: "#2A2A28", prBorder: "#5C2E1C", scene: "#121212", accent: "#FF6B35" },
  gelap: { label: "gelap", bg: "#121212", ink: "#F2F0EB", muted: "#9C9A93", block: "#1B1B1A", blockInk: "#F2F0EB", blockBorder: "#2A2A28", big: "#FF6B35", tile: "#1B1B1A", tileBorder: "#2A2A28", prBorder: "#5C2E1C", scene: "#262624", accent: "#FF6B35" },
  // di latar kapur oranye biasa kurang kontras, jadi aksennya pakai oranye gelap
  kapur: { label: "kapur", bg: "#F2F0EB", ink: "#121212", muted: "#6B6963", block: "#FFFFFF", blockInk: "#121212", blockBorder: "#FFFFFF", big: "#121212", tile: "#FFFFFF", tileBorder: "#DDD8CE", prBorder: "#F2C2AE", scene: "#E9E5DC", accent: "#D9531F" },
} as const;

export type StoryStyle = keyof typeof STORY_STYLES;
export type StoryOptions = { style: StoryStyle; stats: boolean; pr: boolean };
export const DEFAULT_STORY: StoryOptions = { style: "oranye", stats: true, pr: true };

// dari query string: ?gaya=gelap&statistik=0&pr=0
export function parseStoryOptions(params: URLSearchParams): StoryOptions {
  const gaya = params.get("gaya");
  return {
    style: gaya && gaya in STORY_STYLES ? (gaya as StoryStyle) : "oranye",
    stats: params.get("statistik") !== "0",
    pr: params.get("pr") !== "0",
  };
}

export function storyQuery(o: StoryOptions): string {
  const q = new URLSearchParams({ gaya: o.style });
  if (!o.stats) q.set("statistik", "0");
  if (!o.pr) q.set("pr", "0");
  return q.toString();
}
