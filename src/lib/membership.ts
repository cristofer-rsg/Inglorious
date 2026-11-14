export type MembershipPeriod = {
  id: string;
  player_tag: string;
  player_name: string;
  joined_at: string;
  left_at: string | null;
  entry_source: string;
  exit_source: string | null;
};

export type PlayerMembership = {
  tag: string;
  name: string;
  periods: MembershipPeriod[];
  firstEntry: string;
  latestEntry: string;
  lastExit: string | null;
  isActive: boolean;
  accumulatedMs: number;
};

export function summarizeMembershipPeriods(
  rows: readonly MembershipPeriod[],
  now: number,
): PlayerMembership[] {
  const grouped = new Map<string, MembershipPeriod[]>();

  for (const row of rows) {
    const tag = row.player_tag.trim().toUpperCase();
    const current = grouped.get(tag) ?? [];
    current.push(row);
    grouped.set(tag, current);
  }

  return Array.from(grouped.entries()).map(([tag, periods]) => {
    const ordered = [...periods].sort((a, b) =>
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
    );
    const latest = ordered[ordered.length - 1];
    const accumulatedMs = ordered.reduce((total, period) => {
      const start = new Date(period.joined_at).getTime();
      const end = period.left_at ? new Date(period.left_at).getTime() : now;
      return total + Math.max(0, end - start);
    }, 0);

    return {
      tag,
      name: latest.player_name,
      periods: ordered,
      firstEntry: ordered[0].joined_at,
      latestEntry: latest.joined_at,
      lastExit: latest.left_at,
      isActive: latest.left_at === null,
      accumulatedMs,
    };
  }).sort((a, b) => b.accumulatedMs - a.accumulatedMs || a.name.localeCompare(b.name, "pt-BR"));
}
