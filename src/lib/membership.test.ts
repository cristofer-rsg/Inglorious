import { describe, expect, it } from "vitest";
import { summarizeMembershipPeriods, type MembershipPeriod } from "./membership";

function period(overrides: Partial<MembershipPeriod> = {}): MembershipPeriod {
  return {
    id: "period-1",
    player_tag: "#2AAAA",
    player_name: "Jogador",
    joined_at: "2026-11-01T00:00:00.000Z",
    left_at: null,
    entry_source: "sync",
    exit_source: null,
    ...overrides,
  };
}

describe("summarizeMembershipPeriods", () => {
  it("pauses accumulated time while the player is outside the clan", () => {
    const rows = [
      period({
        id: "first",
        joined_at: "2026-11-01T00:00:00.000Z",
        left_at: "2026-11-03T00:00:00.000Z",
      }),
      period({
        id: "second",
        joined_at: "2026-11-08T00:00:00.000Z",
        left_at: "2026-11-10T00:00:00.000Z",
      }),
    ];

    const [player] = summarizeMembershipPeriods(rows, Date.parse("2026-11-14T00:00:00.000Z"));

    expect(player.accumulatedMs).toBe(4 * 24 * 60 * 60 * 1000);
    expect(player.isActive).toBe(false);
    expect(player.periods).toHaveLength(2);
    expect(player.firstEntry).toBe("2026-11-01T00:00:00.000Z");
    expect(player.lastExit).toBe("2026-11-10T00:00:00.000Z");
  });

  it("continues counting the current open membership period", () => {
    const [player] = summarizeMembershipPeriods([
      period({ joined_at: "2026-11-12T00:00:00.000Z" }),
    ], Date.parse("2026-11-14T12:00:00.000Z"));

    expect(player.accumulatedMs).toBe(60 * 60 * 1000 * 60);
    expect(player.isActive).toBe(true);
    expect(player.lastExit).toBeNull();
  });

  it("merges tags case-insensitively and keeps the latest player name", () => {
    const [player] = summarizeMembershipPeriods([
      period({ id: "old", player_tag: "#2aaaa", player_name: "Nome antigo" }),
      period({ id: "new", player_tag: "#2AAAA", player_name: "Nome atual", joined_at: "2026-11-10T00:00:00.000Z" }),
    ], Date.parse("2026-11-14T00:00:00.000Z"));

    expect(player.tag).toBe("#2AAAA");
    expect(player.name).toBe("Nome atual");
    expect(player.periods).toHaveLength(2);
  });

  it("does not count negative or invalid period durations", () => {
    const [player] = summarizeMembershipPeriods([
      period({ joined_at: "2026-11-10T00:00:00.000Z", left_at: "2026-11-09T00:00:00.000Z" }),
    ], Date.parse("2026-11-14T00:00:00.000Z"));

    expect(player.accumulatedMs).toBe(0);
  });
});
