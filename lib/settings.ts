// validasi perubahan pengaturan dari halaman profil. input datang dari browser,
// jadi hanya field yang dikenal dan nilai yang masuk akal yang diterima.

import { ITEMS } from "@/lib/setara";

export type SettingsRow = {
  weekly_target: number;
  unit: "kg" | "lb";
  program: "ppl" | "upper_lower" | "ppl_ul" | "full_body" | "bebas";
  split_schedule: Record<string, string>;
  rest_allowance: number;
  reminder_time: string; // `HH:MM`
  chattiness: "aktif" | "seperlunya";
  compare_mode: "auto" | "lock";
  compare_item: string;
  notify_pr: boolean;
  notify_weekly: boolean;
  notify_schedule: boolean;
  auto_story: boolean;
};

export type SettingsPatch = Partial<SettingsRow>;

const SWITCHES = ["notify_pr", "notify_weekly", "notify_schedule", "auto_story"] as const;
const ITEM_IDS: ReadonlySet<string> = new Set(ITEMS.map((i) => i.id));

// null kalau ada field yang tidak dikenal atau nilainya salah
export function parseSettingsPatch(input: unknown): SettingsPatch | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const patch: SettingsPatch = {};

  for (const [key, value] of Object.entries(input)) {
    switch (key) {
      case "weekly_target":
        if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 7) return null;
        patch.weekly_target = value as number;
        break;
      case "unit":
        if (value !== "kg" && value !== "lb") return null;
        patch.unit = value;
        break;
      case "compare_mode":
        if (value !== "auto" && value !== "lock") return null;
        patch.compare_mode = value;
        break;
      case "program":
        if (value !== "ppl" && value !== "upper_lower" && value !== "ppl_ul" && value !== "full_body" && value !== "bebas") return null;
        patch.program = value;
        break;
      case "rest_allowance":
        if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 7) return null;
        patch.rest_allowance = value as number;
        break;
      case "reminder_time":
        if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
        patch.reminder_time = value;
        break;
      case "chattiness":
        if (value !== "aktif" && value !== "seperlunya") return null;
        patch.chattiness = value;
        break;
      case "compare_item":
        if (typeof value !== "string" || !ITEM_IDS.has(value)) return null;
        patch.compare_item = value;
        break;
      case "split_schedule": {
        const schedule = parseSchedule(value);
        if (!schedule) return null;
        patch.split_schedule = schedule;
        break;
      }
      default:
        if ((SWITCHES as readonly string[]).includes(key)) {
          if (typeof value !== "boolean") return null;
          patch[key as (typeof SWITCHES)[number]] = value;
          break;
        }
        return null;
    }
  }
  return patch;
}

// { "1": "pull", ... } — hari 1 (senin) sampai 7 (minggu); hari yang tidak ada = libur
function parseSchedule(value: unknown): Record<string, string> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [day, split] of Object.entries(value)) {
    if (!/^[1-7]$/.test(day) || typeof split !== "string") return null;
    const clean = split.trim().toLowerCase().replace(/\s+/g, " ");
    if (clean.length > 30) return null;
    if (clean) out[day] = clean;
  }
  return out;
}
