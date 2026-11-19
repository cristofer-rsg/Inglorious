import { describe, expect, it } from "vitest";

import {
  isBeforeFinalTwelveHours,
  extractAttackOrder,
  resolveFirstMirror,
  resolveFirstWithin12h,
  resolveSecondAfter12h,
  resolveWarEnd,
} from "./war-penalties";

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

describe("war discipline audit certainty", () => {
  const cutoff = new Date("2026-11-19T03:36:30.000Z").getTime();

  it("confirms the first attack only when its official time or observation proves it was early", () => {
    expect(resolveFirstWithin12h(null, cutoff - 1, cutoff)).toBe(true);
    expect(resolveFirstWithin12h(null, cutoff + 1, cutoff)).toBeNull();
    expect(resolveFirstWithin12h(cutoff + 1, cutoff - 1, cutoff)).toBe(false);
  });

  it("does not approve a second attack from a late observation without an official time", () => {
    expect(resolveSecondAfter12h(null, cutoff - 1, cutoff)).toBe(false);
    expect(resolveSecondAfter12h(null, cutoff + 1, cutoff)).toBeNull();
    expect(resolveSecondAfter12h(cutoff + 1, cutoff - 1, cutoff)).toBe(true);
  });

  it("keeps checks unknown when the attack timeline is incomplete", () => {
    expect(resolveFirstWithin12h(null, null, cutoff)).toBeNull();
    expect(resolveSecondAfter12h(null, null, cutoff)).toBeNull();
    expect(resolveFirstMirror(null, null, cutoff, null)).toBeNull();
  });

  it("waives the mirror requirement only when the official first-attack time proves it was in the final window", () => {
    expect(resolveFirstMirror(cutoff + 1, null, cutoff, false)).toBe(true);
    expect(resolveFirstMirror(null, null, cutoff, true)).toBe(true);
    expect(resolveFirstMirror(cutoff - 1, null, cutoff, true)).toBe(true);
    expect(resolveFirstMirror(cutoff - 1, null, cutoff, false)).toBe(false);
    expect(resolveFirstMirror(null, cutoff + 1, cutoff, false)).toBeNull();
  });
});

describe("attack timeline source keys", () => {
  it("recovers attack order from stars, mirror, and attack penalty events", () => {
    expect(extractAttackOrder("war:key:#TAG:attack:17:stars")).toBe(17);
    expect(extractAttackOrder("war:key:#TAG:attack:18:observed-time")).toBe(18);
    expect(extractAttackOrder("war:key:#TAG:mirror:19")).toBe(19);
    expect(extractAttackOrder("war:key:#TAG:penalty:off-mirror:20")).toBe(20);
    expect(extractAttackOrder("war:key:#TAG:penalty:early-second:21")).toBe(21);
    expect(extractAttackOrder("war:key:#TAG:participation")).toBeNull();
  });
});
