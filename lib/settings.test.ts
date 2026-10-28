import { describe, expect, it } from "vitest";
import { parseSettingsPatch } from "./settings";

describe("parseSettingsPatch", () => {
  it("nilai yang benar diterima", () => {
    expect(
      parseSettingsPatch({
        weekly_target: 4,
        unit: "lb",
        compare_mode: "lock",
        compare_item: "paus",
        notify_pr: false,
        auto_story: true,
      }),
    ).toEqual({ weekly_target: 4, unit: "lb", compare_mode: "lock", compare_item: "paus", notify_pr: false, auto_story: true });
  });

  it("pengaturan bot aktif", () => {
    expect(
      parseSettingsPatch({ program: "upper_lower", rest_allowance: 2, reminder_time: "06:30", chattiness: "seperlunya" }),
    ).toEqual({ program: "upper_lower", rest_allowance: 2, reminder_time: "06:30", chattiness: "seperlunya" });
  });

  it("program ppl + upper lower", () => {
    expect(parseSettingsPatch({ program: "ppl_ul" })).toEqual({ program: "ppl_ul" });
  });

  it.each([
    [{ program: "bro split" }],
    [{ rest_allowance: -1 }],
    [{ rest_allowance: 8 }],
    [{ reminder_time: "24:00" }],
    [{ reminder_time: "7:00" }],
    [{ chattiness: "cerewet" }],
  ])("%j ditolak (bot aktif)", (input) => {
    expect(parseSettingsPatch(input)).toBeNull();
  });

  it("jadwal split dirapikan, hari kosong = libur", () => {
    expect(parseSettingsPatch({ split_schedule: { "1": " Pull ", "3": "", "6": "full  body" } })).toEqual({
      split_schedule: { "1": "pull", "6": "full body" },
    });
  });

  it.each([
    [{ weekly_target: 0 }],
    [{ weekly_target: 8 }],
    [{ weekly_target: 3.5 }],
    [{ unit: "ton" }],
    [{ compare_item: "naga" }],
    [{ notify_pr: "ya" }],
    [{ split_schedule: { "8": "push" } }],
    [{ split_schedule: { "1": 5 } }],
    [{ split_schedule: { "1": "x".repeat(31) } }],
    [{ user_id: "orang-lain" }], // field yang tidak dikenal
    ["bukan objek"],
    [null],
  ])("%j ditolak", (input) => {
    expect(parseSettingsPatch(input)).toBeNull();
  });
});
