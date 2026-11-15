import { describe, expect, it } from "vitest";
import { calculatePlayerScore, isRankingEligible } from "./scoring";

describe("isRankingEligible", () => {
  it("keeps active eligible members", () => {
    expect(isRankingEligible({ active: true, eligible: "Elegível", role: "member" })).toBe(true);
  });

  it.each(["leader", "co_leader", "coleader", "co-leader", "Co Leader"])(
    "excludes leadership role %s",
    (role) => {
      expect(isRankingEligible({ active: true, eligible: "Elegível", role })).toBe(false);
    },
  );

  it("excludes players who are no longer in the current clan roster", () => {
    expect(isRankingEligible({ active: false, eligible: "Elegível", role: "member" })).toBe(false);
  });

  it("excludes players without an explicit active roster status", () => {
    expect(isRankingEligible({ eligible: "Elegível", role: "member" })).toBe(false);
  });

  it("keeps active members subject to eligibility rules", () => {
    expect(isRankingEligible({ active: true, eligible: "Inelegível", role: "member" })).toBe(false);
  });
});

describe("calculatePlayerScore", () => {
  it("applies the official category rules, caps and penalties", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      events: [
        { player: "Jogador", category: "Guerras", points: 200 },
        { player: "Jogador", category: "Liga dos Clãs", points: 140 },
        { player: "Jogador", category: "Doações", activity: "TROPAS_DOADAS:10000", points: 10000 },
        { player: "Jogador", category: "Jogos do Clã", points: 10000 },
        { player: "Jogador", category: "Raide de Fim de Semana", points: 32 },
        { player: "Jogador", category: "Capital do Clã", activity: "Doação automática de Ouro da Capital", points: 250000 },
        { player: "Jogador", category: "Guerras", points: -15 },
      ],
    });

    expect(result).toEqual({
      wars: 200,
      league: 140,
      donations: 50,
      games: 25,
      raid: 32,
      capitalCoins: 250000,
      capitalPoints: 100,
      penalties: 15,
      total: 532,
    });
  });

  it("does not count other players or unrelated activity categories", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      events: [
        { player: "Outro", category: "Guerras", points: 200 },
        { player: "Jogador", category: "Doações", activity: "Ajuste manual", points: 250000 },
      ],
    });

    expect(result.total).toBe(0);
    expect(result.capitalCoins).toBe(0);
  });

  it("uses monthly donation totals and the larger clan-games snapshot", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      donationsTotal: 5000,
      clanGamesPoints: 20,
      events: [
        { player: "Jogador", category: "Doações", activity: "TROPAS_DOADAS:9000", points: 9000 },
        { player: "Jogador", category: "Jogos do Clã", points: 18 },
      ],
    });

    expect(result.donations).toBe(50);
    expect(result.games).toBe(20);
  });

  it("does not cap war, league or raid points", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      events: [
        { player: "Jogador", category: "Guerras", points: 500 },
        { player: "Jogador", category: "Liga dos Clãs", points: 500 },
        { player: "Jogador", category: "Raide de Fim de Semana", points: 100 },
      ],
    });

    expect(result.wars).toBe(500);
    expect(result.league).toBe(500);
    expect(result.raid).toBe(100);
    expect(result.total).toBe(1100);
  });

  it("converts donations by 100 troops per point and caps them at 50", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      events: [
        { player: "Jogador", category: "Doações", activity: "TROPAS_DOADAS:50", points: 50 },
        { player: "Jogador", category: "Doações", activity: "TROPAS_DOADAS:250", points: 250 },
      ],
    });

    expect(result.donations).toBe(3);
  });

  it("uses the maximum clan-games band and caps it at 25 points", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      clanGamesPoints: 10000,
      events: [{ player: "Jogador", category: "Jogos do Clã", points: 20 }],
    });

    expect(result.games).toBe(25);
  });

  it("converts capital contributions at 2,500 coins per point", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      events: [{
        player: "Jogador",
        category: "Capital do Clã",
        activity: "Doação automática de Ouro da Capital",
        points: 7499,
      }],
    });

    expect(result.capitalCoins).toBe(7499);
    expect(result.capitalPoints).toBe(2);
    expect(result.total).toBe(2);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "ignores invalid monthly clan-games snapshot values (%s)",
    (clanGamesPoints) => {
      const result = calculatePlayerScore({
        playerName: "Jogador",
        clanGamesPoints,
        events: [{ player: "Jogador", category: "Guerras", points: 50 }],
      });

      expect(result.games).toBe(0);
      expect(result.wars).toBe(50);
    },
  );

  it("uses integer donation conversion without rounding up", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      events: [{ player: "Jogador", category: "Doações", activity: "TROPAS_DOADAS:99", points: 99 }],
    });
    expect(result.donations).toBe(0);
  });

  it("never returns a negative total after penalties", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      events: [{ player: "Jogador", category: "Guerras", points: -500 }],
    });

    expect(result.total).toBe(0);
    expect(result.penalties).toBe(500);
  });

  it("isolates players with identical names by their Clash tags", () => {
    const events = [
      { player: "Alex", player_tag: "#2AAAA", category: "Guerras", points: 100 },
      { player: "Alex", player_tag: "#2BBBB", category: "Guerras", points: 50 },
    ];

    const first = calculatePlayerScore({ playerName: "Alex", playerTag: "#2AAAA", events });
    const second = calculatePlayerScore({ playerName: "Alex", playerTag: "#2BBBB", events });

    expect(first.wars).toBe(100);
    expect(second.wars).toBe(50);
  });

  it("keeps legacy events without tags compatible by player name", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      playerTag: "#2AAAA",
      events: [{ player: "Jogador", category: "Guerras", points: 75 }],
    });

    expect(result.wars).toBe(75);
  });

  it("does not assign untagged legacy events to duplicate-name players", () => {
    const result = calculatePlayerScore({
      playerName: "Alex",
      playerTag: "#2AAAA",
      allowLegacyNameFallback: false,
      events: [
        { player: "Alex", category: "Guerras", points: 100 },
        { player: "Alex", player_tag: "#2AAAA", category: "Guerras", points: 25 },
      ],
    });

    expect(result.wars).toBe(25);
  });

  it("falls back to tagged donation events when no monthly snapshot exists", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      playerTag: "#2AAAA",
      events: [{
        player: "Jogador",
        player_tag: "#2AAAA",
        category: "Doações",
        activity: "TROPAS_DOADAS: sincronização automática mensal",
        points: 2500,
      }],
    });

    expect(result.donations).toBe(25);
  });

  it("uses the monthly donation snapshot even when it is zero", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      playerTag: "#2AAAA",
      donationsTotal: 0,
      events: [
        {
          player: "Jogador",
          player_tag: "#2AAAA",
          category: "Doações",
          activity: "TROPAS_DOADAS: sincronização automática mensal",
          points: 10000,
        },
      ],
    });

    expect(result.donations).toBe(0);
  });

  it("keeps legacy donation points when the monthly troop snapshot is present", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      playerTag: "#2AAAA",
      donationsTotal: 5000,
      events: [
        {
          player: "Jogador",
          player_tag: "#2AAAA",
          category: "Doações",
          activity: "Lançamento manual antigo",
          points: 4,
        },
      ],
    });

    expect(result.donations).toBe(50);
  });
});
