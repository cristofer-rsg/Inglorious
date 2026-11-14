export type ActivityMetrics = {
  wars: number;
  league: number;
  raid: number;
  donations: number;
  games: number;
  capital: number;
};

const METRICS = ["wars", "league", "raid", "donations", "games", "capital"] as const;

export function addActivityIndex<T extends ActivityMetrics>(
  rows: readonly T[],
): Array<T & { activityIndex: number }> {
  const maxima = Object.fromEntries(
    METRICS.map((metric) => [
      metric,
      Math.max(0, ...rows.map((row) => row[metric])),
    ]),
  ) as Record<(typeof METRICS)[number], number>;

  return rows.map((row) => {
    const total = METRICS.reduce((sum, metric) => {
      const maximum = maxima[metric];
      return sum + (maximum > 0 ? (row[metric] / maximum) * 100 : 0);
    }, 0);

    return {
      ...row,
      activityIndex: Math.round(total * 10) / 10,
    };
  });
}
