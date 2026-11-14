import { describe, expect, it } from "vitest";

import { createMonthlyDonationMaps } from "./monthly-stats";

describe("createMonthlyDonationMaps", () => {
  it("does not treat null snapshots as authoritative zero totals", () => {
    const maps = createMonthlyDonationMaps([
      { player_tag: "#2AAAA", player: "Alex", donations: null },
    ]);

    expect(maps.byTag.has("#2AAAA")).toBe(false);
    expect(maps.byName.has("alex")).toBe(false);
  });

  it("preserves an explicit zero snapshot as the authoritative total", () => {
    const maps = createMonthlyDonationMaps([
      { player_tag: "#2AAAA", player: "Alex", donations: 0 },
    ]);

    expect(maps.byTag.get("#2AAAA")).toBe(0);
    expect(maps.byName.get("alex")).toBe(0);
  });

  it("normalizes tags and names without merging different player tags", () => {
    const maps = createMonthlyDonationMaps([
      { player_tag: " #2AAAA ", player: "Alex", donations: 2500 },
      { player_tag: "#2BBBB", player: "Alex", donations: 5000 },
    ]);

    expect(maps.byTag.get("#2AAAA")).toBe(2500);
    expect(maps.byTag.get("#2BBBB")).toBe(5000);
    expect(maps.byName.has("alex")).toBe(false);
  });

  it("ignores non-finite snapshot values", () => {
    const maps = createMonthlyDonationMaps([
      { player_tag: "#2AAAA", player: "Alex", donations: Number.NaN },
    ]);

    expect(maps.byTag.size).toBe(0);
    expect(maps.byName.size).toBe(0);
  });
});
