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

export function parseClashApiTimestamp(value: string): Date | null {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.(\d{1,3}))?Z$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second, milliseconds = "0"] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  const [numericYear, numericMonth, numericDay, numericHour, numericMinute, numericSecond] = parts;
  const date = new Date(Date.UTC(
    numericYear,
    numericMonth - 1,
    numericDay,
    numericHour,
    numericMinute,
    numericSecond,
    Number(milliseconds.padEnd(3, "0")),
  ));

  if (
    date.getUTCFullYear() !== numericYear
    || date.getUTCMonth() !== numericMonth - 1
    || date.getUTCDate() !== numericDay
    || date.getUTCHours() !== numericHour
    || date.getUTCMinutes() !== numericMinute
    || date.getUTCSeconds() !== numericSecond
  ) {
    return null;
  }

  return date;
}

export function getClashSeasonMonth(season: string | null | undefined): string | null {
  if (!season) return null;
  const match = season.match(/^(\\d{4})-?(0[1-9]|1[0-2])$/);
  return match ? `${match[1]}-${match[2]}` : null;
}
