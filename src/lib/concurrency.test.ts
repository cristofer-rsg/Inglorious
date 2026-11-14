import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("preserves input order when tasks finish out of order", async () => {
    const result = await mapWithConcurrency(
      [30, 10, 20],
      async (value) => {
        await new Promise((resolve) => setTimeout(resolve, value));
        return value * 2;
      },
      3,
    );

    expect(result).toEqual([60, 20, 40]);
  });

  it("never exceeds the configured number of concurrent tasks", async () => {
    let active = 0;
    let maximumActive = 0;

    const result = await mapWithConcurrency(
      [1, 2, 3, 4, 5, 6, 7, 8],
      async (value) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return value;
      },
      3,
    );

    expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(maximumActive).toBe(3);
  });

  it("rejects a non-positive or non-integer concurrency limit", async () => {
    await expect(mapWithConcurrency([1], async (value) => value, 0))
      .rejects.toThrow("A concorrência deve ser um inteiro positivo.");
    await expect(mapWithConcurrency([1], async (value) => value, 1.5))
      .rejects.toThrow("A concorrência deve ser um inteiro positivo.");
  });

  it("returns an empty array for empty input", async () => {
    await expect(mapWithConcurrency([], async (value: number) => value)).resolves.toEqual([]);
  });
});
