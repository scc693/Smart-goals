import { describe, expect, it } from "vitest";
import { calculateLevel, xpForLevel } from "@/hooks/useUserStats";

describe("useUserStats helpers", () => {
  it("calculates levels based on XP thresholds", () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(399)).toBe(2);
    expect(calculateLevel(400)).toBe(3);
  });

  it("computes XP required for each level", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(400);
  });

  it("keeps calculateLevel consistent with xpForLevel", () => {
    const level = 4;
    const threshold = xpForLevel(level);

    expect(calculateLevel(threshold)).toBe(level);
    expect(calculateLevel(threshold + 99)).toBe(level);
  });
});
