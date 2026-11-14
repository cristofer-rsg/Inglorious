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

  it("never returns a negative total after penalties", () => {
    const result = calculatePlayerScore({
      playerName: "Jogador",
      events: [{ player: "Jogador", category: "Guerras", points: -500 }],
    });

    expect(result.total).toBe(0);
    expect(result.penalties).toBe(500);
  });
});
