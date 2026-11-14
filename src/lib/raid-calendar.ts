export type RaidWeekend = {
  weekendStart: string;
  closingDate: string;
  monthKey: string;
};

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function parseRaidStartTime(value: string): Date {
  const clashTime = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.(\d{1,3}))?Z$/);
  if (clashTime) {
    const [, year, month, day, hour, minute, second, milliseconds = "0"] = clashTime;
    const date = new Date(Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(milliseconds.padEnd(3, "0")),
    ));

    if (
      date.getUTCFullYear() !== Number(year)
      || date.getUTCMonth() !== Number(month) - 1
      || date.getUTCDate() !== Number(day)
      || date.getUTCHours() !== Number(hour)
      || date.getUTCMinutes() !== Number(minute)
      || date.getUTCSeconds() !== Number(second)
    ) {
      return new Date(Number.NaN);
    }

    return date;
  }

  return new Date(value);
}

export function getRaidWeekend(startTime: string, timeZone: string): RaidWeekend {
  const date = parseRaidStartTime(startTime);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Data inicial do Raide inválida.");
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const localDate = `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
  const weekday = new Date(`${localDate}T12:00:00Z`).getUTCDay();
  const daysSinceFriday = (weekday + 2) % 7;
  const weekendStart = shiftDate(localDate, -daysSinceFriday);
  const closingDate = shiftDate(weekendStart, 3);

  return {
    weekendStart,
    closingDate,
    monthKey: closingDate.slice(0, 7),
  };
}
