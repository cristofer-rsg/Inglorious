import { describe, expect, it } from "vitest";

import { getZonedMonthBounds } from "./time";

describe("getZonedMonthBounds", () => {
  it("uses the configured São Paulo offset for month boundaries", () => {
    expect(getZonedMonthBounds("2026-11", "America/Sao_Paulo")).toEqual({
      start: "2026-11-01T03:00:00.000Z",
      end: "2026-12-01T03:00:00.000Z",
    });
  });

  it("accounts for daylight-saving offset changes between month boundaries", () => {
    expect(getZonedMonthBounds("2026-03", "America/New_York")).toEqual({
      start: "2026-03-01T05:00:00.000Z",
      end: "2026-04-01T04:00:00.000Z",
    });
  });

  it("rejects invalid month keys", () => {
    expect(() => getZonedMonthBounds("2026-13", "America/Sao_Paulo"))
      .toThrow("Mês inválido para cálculo do período.");
  });
});
