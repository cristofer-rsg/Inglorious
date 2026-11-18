import { describe, expect, it } from "vitest";

import { isBeforeFinalTwelveHours, resolveWarEnd } from "./war-penalties";

describe("war penalty time window", () => {
  const startedAt = new Date("2026-11-18T15:36:30.000Z");

  it("uses the scheduled 24-hour end while the war is active, even if the API sends an early end", () => {
    const earlyApiEnd = new Date("2026-11-18T18:00:00.000Z");
    const resolved = resolveWarEnd(startedAt, earlyApiEnd, "inWar");

    expect(resolved.toISOString()).toBe("2026-11-19T15:36:30.000Z");
  });

  it("uses a valid official end after the war has ended", () => {
    const officialEnd = new Date("2026-11-19T15:30:00.000Z");
    const resolved = resolveWarEnd(startedAt, officialEnd, "warEnded");

    expect(resolved).toBe(officialEnd);
  });

  it("falls back to 24 hours when the ended-war API timestamp is invalid", () => {
    const invalidEnd = new Date("2026-11-18T14:00:00.000Z");
    const resolved = resolveWarEnd(startedAt, invalidEnd, "warEnded");

    expect(resolved.toISOString()).toBe("2026-11-19T15:36:30.000Z");
  });

  it("penalizes a second attack observed before the final 12-hour window", () => {
    const observedAt = new Date("2026-11-18T19:21:44.000Z");
    const warEnd = resolveWarEnd(startedAt, null, "inWar");

    expect(isBeforeFinalTwelveHours(observedAt, warEnd)).toBe(true);
  });

  it("uses the official attack time when it is available", () => {
    const observedAt = new Date("2026-11-19T05:00:00.000Z");
    const warEnd = resolveWarEnd(startedAt, null, "inWar");
    const attackTime = new Date("2026-11-18T20:00:00.000Z");

    expect(isBeforeFinalTwelveHours(observedAt, warEnd, attackTime)).toBe(true);
  });
});
