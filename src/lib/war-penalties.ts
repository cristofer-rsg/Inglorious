export function resolveWarEnd(
  startedAt: Date,
  officialEndAt: Date | null,
  state: "inWar" | "warEnded",
): Date {
  const fallbackEnd = new Date(startedAt.getTime() + 24 * 60 * 60 * 1000);

  if (state === "inWar") return fallbackEnd;

  if (
    officialEndAt
    && Number.isFinite(officialEndAt.getTime())
    && officialEndAt.getTime() > startedAt.getTime()
  ) {
    return officialEndAt;
  }

  return fallbackEnd;
}

export function isBeforeFinalTwelveHours(
  observedAt: Date,
  warEnd: Date,
  attackBattleTime?: Date | null,
): boolean {
  const referenceTime = attackBattleTime ?? observedAt;
  return referenceTime.getTime() < warEnd.getTime() - 12 * 60 * 60 * 1000;
}
