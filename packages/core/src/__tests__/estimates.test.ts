import { describe, it, expect } from "vitest";
import { resolveBaseline, estimateBaselines } from "../cpfi/estimates.js";

describe("resolveBaseline", () => {
  it("returns exact baseline for tested input", () => {
    const baseline = {
      cooperMeters: 2500,
      pushUps: 30,
      sitUps: 30,
      pullUps: 8,
      standingJumpCm: 210,
      backExtensionReps: 42,
    };
    const result = resolveBaseline({ type: "tested", baseline });
    expect(result).toEqual(baseline);
  });

  it("returns level baseline for estimate without overrides", () => {
    const result = resolveBaseline({ type: "estimated", level: "moderate" });
    expect(result).toEqual(estimateBaselines.moderate);
  });

  it("applies overrides to estimate baseline", () => {
    const result = resolveBaseline({
      type: "estimated",
      level: "beginner",
      overrides: { pullUps: 10, cooperMeters: 2800 },
    });
    expect(result.pullUps).toBe(10);
    expect(result.cooperMeters).toBe(2800);
    // Other fields from beginner baseline
    expect(result.pushUps).toBe(estimateBaselines.beginner.pushUps);
    expect(result.sitUps).toBe(estimateBaselines.beginner.sitUps);
  });

  it("estimate levels are ordered by fitness", () => {
    const levels = ["untrained", "beginner", "moderate", "athletic", "competitive"] as const;
    for (let i = 1; i < levels.length; i++) {
      const prev = estimateBaselines[levels[i - 1]!];
      const curr = estimateBaselines[levels[i]!];
      expect(curr.cooperMeters).toBeGreaterThan(prev.cooperMeters);
      expect(curr.pushUps).toBeGreaterThan(prev.pushUps);
      expect(curr.pullUps).toBeGreaterThanOrEqual(prev.pullUps);
    }
  });
});
