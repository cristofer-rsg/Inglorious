import { describe, expect, it } from "vitest";
import { addActivityIndex } from "./performance";

describe("addActivityIndex", () => {
  it("gives each of the six categories equal weight up to 100 points", () => {
    const rows = addActivityIndex([
      { player: "A", wars: 10, league: 10, raid: 10, donations: 100, games: 1000, capital: 5000 },
      { player: "B", wars: 5, league: 5, raid: 5, donations: 50, games: 500, capital: 2500 },
    ]);

    expect(rows[0].activityIndex).toBe(600);
    expect(rows[1].activityIndex).toBe(300);
  });

  it("returns zero for categories with no activity in the selected month", () => {
    const rows = addActivityIndex([
      { wars: 0, league: 0, raid: 0, donations: 0, games: 0, capital: 0 },
      { wars: 0, league: 0, raid: 0, donations: 0, games: 0, capital: 0 },
    ]);

    expect(rows.map((row) => row.activityIndex)).toEqual([0, 0]);
  });

  it("rounds the combined index to one decimal place", () => {
    const rows = addActivityIndex([
      { wars: 1, league: 0, raid: 0, donations: 0, games: 0, capital: 0 },
      { wars: 3, league: 0, raid: 0, donations: 0, games: 0, capital: 0 },
    ]);

    expect(rows[0].activityIndex).toBe(33.3);
    expect(rows[1].activityIndex).toBe(100);
  });
});
