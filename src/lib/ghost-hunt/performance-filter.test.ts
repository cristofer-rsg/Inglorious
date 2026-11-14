import { describe, expect, it } from "vitest";
import {
  countEventSituations,
  filterEventSituation,
  getEventSituation,
} from "./performance-filter";

type Player = { name: string; warAttacks: number | null };

const attacks = (player: Player) => player.warAttacks;

describe("event situation filtering", () => {
  const players: Player[] = [
    { name: "Atacou", warAttacks: 2 },
    { name: "Sem ataque", warAttacks: 0 },
    { name: "Não participou", warAttacks: null },
  ];

  it("distinguishes attacks, zero attacks and no participation", () => {
    expect(players.map((player) => getEventSituation(player.warAttacks))).toEqual([
      "attacked",
      "no-attack",
      "no-data",
    ]);
  });

  it("filters the selected situation without changing the event rows", () => {
    expect(filterEventSituation(players, "war", "attacked", attacks).map((player) => player.name))
      .toEqual(["Atacou"]);
    expect(filterEventSituation(players, "war", "no-attack", attacks).map((player) => player.name))
      .toEqual(["Sem ataque"]);
    expect(filterEventSituation(players, "war", "no-data", attacks).map((player) => player.name))
      .toEqual(["Não participou"]);
    expect(filterEventSituation(players, "", "attacked", attacks)).toEqual(players);
    expect(filterEventSituation(players, "war", "", attacks)).toEqual(players);
  });

  it("counts each situation using the same classification as the filter", () => {
    expect(countEventSituations(players, "war", attacks)).toEqual({
      attacked: 1,
      noAttack: 1,
      noData: 1,
    });
  });
});
