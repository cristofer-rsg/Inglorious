import { describe, expect, it } from "vitest";

import { getRaidWeekend } from "./raid-calendar";

describe("getRaidWeekend", () => {
  it("maps Friday through Monday to the same weekend", () => {
    const dates = [
      "2026-11-13T12:00:00.000Z",
      "2026-11-14T12:00:00.000Z",
      "2026-11-15T12:00:00.000Z",
      "2026-11-16T12:00:00.000Z",
    ];

    for (const date of dates) {
      expect(getRaidWeekend(date, "America/Sao_Paulo")).toEqual({
        weekendStart: "2026-11-13",
        closingDate: "2026-11-16",
        monthKey: "2026-11",
      });
    }
  });

  it("assigns the weekend to the month in which Monday closes", () => {
    expect(getRaidWeekend("2026-10-30T12:00:00.000Z", "America/Sao_Paulo")).toEqual({
      weekendStart: "2026-10-30",
      closingDate: "2026-11-02",
      monthKey: "2026-11",
    });
  });

  it("uses the configured timezone to determine the local raid date", () => {
    expect(getRaidWeekend("2026-11-01T02:00:00.000Z", "America/Sao_Paulo")).toEqual({
      weekendStart: "2026-10-30",
      closingDate: "2026-11-02",
      monthKey: "2026-11",
    });
  });

  it("rejects an invalid API timestamp", () => {
    expect(() => getRaidWeekend("invalid", "America/Sao_Paulo")).toThrow("Data inicial do Raide inválida.");
  });
});
