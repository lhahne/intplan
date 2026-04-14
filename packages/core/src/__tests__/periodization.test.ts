import { describe, it, expect } from "vitest";
import { allocatePhases } from "../plan/periodization.js";

describe("allocatePhases", () => {
  it("allocates 6 phases for 24+ weeks", () => {
    const phases = allocatePhases(24);
    expect(phases).toHaveLength(6);
    expect(phases[0]!.phase).toBe("anatomical_adaptation");
    expect(phases[5]!.phase).toBe("taper");

    // Total weeks should equal input
    const totalWeeks = phases.reduce((sum, p) => sum + (p.endWeek - p.startWeek + 1), 0);
    expect(totalWeeks).toBe(24);
  });

  it("distributes extra weeks for long plans", () => {
    const phases = allocatePhases(36);
    const totalWeeks = phases.reduce((sum, p) => sum + (p.endWeek - p.startWeek + 1), 0);
    expect(totalWeeks).toBe(36);
  });

  it("allocates correctly for 16-23 week range", () => {
    const phases = allocatePhases(18);
    expect(phases[0]!.phase).toBe("anatomical_adaptation");
    const totalWeeks = phases.reduce((sum, p) => sum + (p.endWeek - p.startWeek + 1), 0);
    expect(totalWeeks).toBe(18);
  });

  it("skips adaptation for short plans (8-15 weeks)", () => {
    const phases = allocatePhases(10);
    expect(phases[0]!.phase).toBe("aerobic_base");
    const totalWeeks = phases.reduce((sum, p) => sum + (p.endWeek - p.startWeek + 1), 0);
    expect(totalWeeks).toBe(10);
  });

  it("handles very short plans (<8 weeks)", () => {
    const phases = allocatePhases(5);
    expect(phases.length).toBeGreaterThanOrEqual(2);
    const totalWeeks = phases.reduce((sum, p) => sum + (p.endWeek - p.startWeek + 1), 0);
    expect(totalWeeks).toBe(5);
  });

  it("weeks are contiguous and start at 1", () => {
    const phases = allocatePhases(24);
    expect(phases[0]!.startWeek).toBe(1);
    for (let i = 1; i < phases.length; i++) {
      expect(phases[i]!.startWeek).toBe(phases[i - 1]!.endWeek + 1);
    }
  });
});
