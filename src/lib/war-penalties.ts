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

export type WarAuditCheck = boolean | null;

export function resolveFirstWithin12h(
  actualAttackTime: number | null,
  observedAt: number | null,
  cutoff: number,
  noAttacks = false,
): WarAuditCheck {
  if (noAttacks) return false;
  if (actualAttackTime !== null) return actualAttackTime <= cutoff;
  return observedAt !== null && observedAt <= cutoff ? true : null;
}

export function resolveSecondAfter12h(
  actualAttackTime: number | null,
  observedAt: number | null,
  cutoff: number,
  missedSecond = false,
  noAttacks = false,
): WarAuditCheck {
  if (noAttacks || missedSecond) return false;
  if (actualAttackTime !== null) return actualAttackTime >= cutoff;
  return observedAt !== null && observedAt < cutoff ? false : null;
}

export function resolveFirstMirror(
  actualAttackTime: number | null,
  observedAt: number | null,
  cutoff: number,
  mirrorResult: WarAuditCheck,
): WarAuditCheck {
  if (actualAttackTime !== null && actualAttackTime >= cutoff) return true;
  if (actualAttackTime !== null) return mirrorResult;
  return observedAt !== null && observedAt < cutoff ? mirrorResult : null;
}
