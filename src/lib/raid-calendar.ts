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

export function getRaidWeekend(startTime: string, timeZone: string): RaidWeekend {
  const date = new Date(startTime);
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
