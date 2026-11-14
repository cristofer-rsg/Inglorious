export type MonthlyDonationStat = {
  player_tag: string | null;
  player: string | null;
  donations: number | null;
};

export function createMonthlyDonationMaps(stats: readonly MonthlyDonationStat[]) {
  const byTag = new Map<string, number>();
  const byName = new Map<string, number>();

  for (const row of stats) {
    if (row.donations == null || !Number.isFinite(Number(row.donations))) continue;

    if (row.player_tag?.trim()) {
      byTag.set(row.player_tag.trim().toUpperCase(), Number(row.donations));
    }
    if (row.player?.trim()) {
      byName.set(row.player.trim().toLocaleLowerCase("pt-BR"), Number(row.donations));
    }
  }

  return { byTag, byName };
}
