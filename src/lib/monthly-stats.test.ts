import { describe, expect, it } from "vitest";

import { createMonthlyStatMaps } from "./monthly-stats";

describe("createMonthlyStatMaps", () => {
  it("does not treat null snapshots as authoritative zero totals", () => {
    const maps = createMonthlyStatMaps([
      { player_tag: "#2AAAA", player: "Alex", donations: null, clan_games_points: null },
    ]);

    expect(maps.donations.byTag.has("#2AAAA")).toBe(false);
    expect(maps.donations.byName.has("alex")).toBe(false);
    expect(maps.clanGames.byTag.has("#2AAAA")).toBe(false);
    expect(maps.clanGames.byName.has("alex")).toBe(false);
  });

  it("preserves explicit zero snapshots as authoritative totals", () => {
    const maps = createMonthlyStatMaps([
      { player_tag: "#2AAAA", player: "Alex", donations: 0, clan_games_points: 0 },
    ]);

    expect(maps.donations.byTag.get("#2AAAA")).toBe(0);
    expect(maps.donations.byName.get("alex")).toBe(0);
    expect(maps.clanGames.byTag.get("#2AAAA")).toBe(0);
    expect(maps.clanGames.byName.get("alex")).toBe(0);
  });

  it("normalizes tags and refuses ambiguous legacy names", () => {
    const maps = createMonthlyStatMaps([
      { player_tag: " #2AAAA ", player: "Alex", donations: 2500, clan_games_points: 4000 },
      { player_tag: "#2BBBB", player: "Alex", donations: 5000, clan_games_points: 6000 },
    ]);

    expect(maps.donations.byTag.get("#2AAAA")).toBe(2500);
    expect(maps.donations.byTag.get("#2BBBB")).toBe(5000);
    expect(maps.donations.byName.has("alex")).toBe(false);
    expect(maps.clanGames.byTag.get("#2AAAA")).toBe(4000);
    expect(maps.clanGames.byTag.get("#2BBBB")).toBe(6000);
    expect(maps.clanGames.byName.has("alex")).toBe(false);
  });

  it("ignores non-finite snapshot values", () => {
    const maps = createMonthlyStatMaps([
      { player_tag: "#2AAAA", player: "Alex", donations: Number.NaN, clan_games_points: Number.POSITIVE_INFINITY },
    ]);

    expect(maps.donations.byTag.size).toBe(0);
    expect(maps.donations.byName.size).toBe(0);
    expect(maps.clanGames.byTag.size).toBe(0);
    expect(maps.clanGames.byName.size).toBe(0);
  });
});
