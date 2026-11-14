import { describe, expect, it } from "vitest";
import { calculatePlayerScore, isRankingEligible } from "./scoring";

describe("isRankingEligible", () => {
  it("keeps active eligible members without Telegram dependency", () => {
    expect(isRankingEligible({ active: true, eligible: "Elegível", role: "member" })).toBe(true);
  });

  it.each(["leader", "co_leader", "coleader", "co-leader", "Co Leader"])(
    "excludes leadership role %s",
    (role) => {
      expect(isRankingEligible({ active: true, eligible: "Elegível", role })).toBe(false);
    },
  );

  it("excludes inactive or explicitly ineligible members", () => {
    expect(isRankingEligible({ active: false, eligible: "Elegível", role: "member" })).toBe(false);
    expect(isRankingEligible({ active: true, eligible: "Inelegível", role: "member" })).toBe(false);
  });
});

describe("calculatePlayerScore", () => {
  it("applies category targets, caps and penalties", () => {
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
      league: 200,
      donations: 150,
      games: 100,
      raid: 150,
      capitalCoins: 250000,
      capitalPoints: 200,
      penalties: 15,
      total: 985,
    });
  });

  it("does not count other players or unrelated capital activities", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      events: [
        { player: "Outro", category: "Guerras", points: 200 },
        { player: "Jogador", category: "Capital do Clã", activity: "Ajuste manual", points: 250000 },
      ],
    });

    expect(result.total).toBe(0);
    expect(result.capitalCoins).toBe(0);
  });

  it("uses monthly donation totals and the larger clan-games snapshot", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      donationsTotal: 5000,
      clanGamesPoints: 8000,
      events: [
        { player: "Jogador", category: "Doações", activity: "TROPAS_DOADAS:9000", points: 9000 },
        { player: "Jogador", category: "Jogos do Clã", points: 6000 },
      ],
    });

    expect(result.donations).toBe(75);
    expect(result.games).toBe(80);
  });

  it("caps each category at its configured maximum", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      events: [
        { player: "Jogador", category: "Guerras", points: 500 },
        { player: "Jogador", category: "Liga dos Clãs", points: 500 },
        { player: "Jogador", category: "Doações", activity: "TROPAS_DOADAS:30000", points: 30000 },
        { player: "Jogador", category: "Jogos do Clã", points: 30000 },
        { player: "Jogador", category: "Raide de Fim de Semana", points: 100 },
        { player: "Jogador", category: "Capital do Clã", activity: "Doação automática de Ouro da Capital", points: 500000 },
      ],
    });

    expect(result.wars).toBe(200);
    expect(result.league).toBe(200);
    expect(result.donations).toBe(150);
    expect(result.games).toBe(100);
    expect(result.raid).toBe(150);
    expect(result.capitalPoints).toBe(200);
  });

  it("rounds category scores to the nearest integer", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      events: [{ player: "Jogador", category: "Doações", activity: "TROPAS_DOADAS:33", points: 33 }],
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

  it("ignores monthly donation snapshots belonging to another tag at the caller boundary", () => {
    const events = [
      {
        player: "Alex",
        player_tag: "#2AAAA",
        category: "Doações",
        activity: "TROPAS_DOADAS: sincronização automática mensal",
        points: 10000,
      },
      {
        player: "Alex",
        player_tag: "#2BBBB",
        category: "Doações",
        activity: "TROPAS_DOADAS: sincronização automática mensal",
        points: 5000,
      },
    ];

    const first = calculatePlayerScore({
      playerName: "Alex",
      playerTag: "#2AAAA",
      events,
    });
    const second = calculatePlayerScore({
      playerName: "Alex",
      playerTag: "#2BBBB",
      events,
    });

    expect(first.donations).toBe(150);
    expect(second.donations).toBe(75);
  });

  it("uses monthly donation totals as the authoritative source instead of adding snapshots", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      playerTag: "#2AAAA",
      donationsTotal: 2500,
      events: [
        {
          player: "Jogador",
          player_tag: "#2AAAA",
          category: "Doações",
          activity: "TROPAS_DOADAS: sincronização automática mensal",
          points: 2500,
        },
      ],
    });

    expect(result.donations).toBe(38);
  });

});
