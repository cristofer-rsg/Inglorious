function zonedMidnightIso(year: number, month: number, timeZone: string): string {
  const targetUtc = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  let timestamp = targetUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatter.formatToParts(new Date(timestamp));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((entry) => entry.type === type)?.value);
    const representedUtc = Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
      part("second"),
    );
    const correction = targetUtc - representedUtc;
    if (correction === 0) break;
    timestamp += correction;
  }

  return new Date(timestamp).toISOString();
}

export function getZonedMonthBounds(monthKey: string, timeZone: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    throw new Error("Mês inválido para cálculo do período.");
  }

  const [year, month] = monthKey.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    start: zonedMidnightIso(year, month, timeZone),
    end: zonedMidnightIso(nextYear, nextMonth, timeZone),
  };
}
