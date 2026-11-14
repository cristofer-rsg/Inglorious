export type EventKey = "war" | "league" | "raid";
export type EventSituation = "attacked" | "no-attack" | "no-data";

export type EventSituationCounts = {
  attacked: number;
  noAttack: number;
  noData: number;
};

export function getEventSituation(attacks: number | null): EventSituation {
  if (attacks === null) return "no-data";
  return attacks > 0 ? "attacked" : "no-attack";
}

export function filterEventSituation<T>(
  rows: readonly T[],
  event: EventKey | "",
  situation: EventSituation | "",
  getAttacks: (row: T, event: EventKey) => number | null,
): T[] {
  if (!event || !situation) return [...rows];
  return rows.filter((row) => getEventSituation(getAttacks(row, event)) === situation);
}

export function countEventSituations<T>(
  rows: readonly T[],
  event: EventKey,
  getAttacks: (row: T, event: EventKey) => number | null,
): EventSituationCounts {
  return rows.reduce<EventSituationCounts>((counts, row) => {
    const situation = getEventSituation(getAttacks(row, event));
    if (situation === "attacked") counts.attacked += 1;
    else if (situation === "no-attack") counts.noAttack += 1;
    else counts.noData += 1;
    return counts;
  }, { attacked: 0, noAttack: 0, noData: 0 });
}
