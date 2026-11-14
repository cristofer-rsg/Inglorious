export type MonthlyStatSnapshotRow = {
  player_tag: string | null;
  player: string | null;
  donations: number | null;
  clan_games_points: number | null;
};

type SnapshotMaps = {
  byTag: Map<string, number>;
  byName: Map<string, number>;
};

function createSnapshotMaps(
  stats: readonly MonthlyStatSnapshotRow[],
  field: "donations" | "clan_games_points",
): SnapshotMaps {
  const byTag = new Map<string, number>();
  const byName = new Map<string, number>();
  const nameCounts = new Map<string, number>();

  for (const row of stats) {
    const name = row.player?.trim().toLocaleLowerCase("pt-BR");
    if (name) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }

  for (const row of stats) {
    const value = row[field];
    if (value == null || !Number.isFinite(Number(value))) continue;

    if (row.player_tag?.trim()) {
      byTag.set(row.player_tag.trim().toUpperCase(), Number(value));
    }

    const name = row.player?.trim().toLocaleLowerCase("pt-BR");
    if (name && nameCounts.get(name) === 1) {
      byName.set(name, Number(value));
    }
  }

  return { byTag, byName };
}

export function createMonthlyStatMaps(stats: readonly MonthlyStatSnapshotRow[]) {
  return {
    donations: createSnapshotMaps(stats, "donations"),
    clanGames: createSnapshotMaps(stats, "clan_games_points"),
  };
}
