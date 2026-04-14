import { describe, it, expect } from "vitest";
import { allocatePhases } from "../plan/periodization.js";

function totalWeeksOf(phases: ReturnType<typeof allocatePhases>) {
  return phases.reduce((sum, p) => sum + (p.endWeek - p.startWeek + 1), 0);
}

describe("allocatePhases", () => {
  it("allocates 6 phases for 24-29 weeks", () => {
    const phases = allocatePhases(24);
    expect(phases).toHaveLength(6);
    expect(phases[0]!.phase).toBe("anatomical_adaptation");
    expect(phases[5]!.phase).toBe("taper");
    expect(totalWeeksOf(phases)).toBe(24);
  });

  it("allocates correctly for 16-23 week range", () => {
    const phases = allocatePhases(18);
    expect(phases[0]!.phase).toBe("anatomical_adaptation");
    expect(totalWeeksOf(phases)).toBe(18);
  });

  it("skips adaptation for short plans (8-15 weeks)", () => {
    const phases = allocatePhases(10);
    expect(phases[0]!.phase).toBe("aerobic_base");
    expect(totalWeeksOf(phases)).toBe(10);
  });

  it("handles very short plans (<8 weeks)", () => {
    const phases = allocatePhases(5);
    expect(phases.length).toBeGreaterThanOrEqual(2);
    expect(totalWeeksOf(phases)).toBe(5);
  });

  it("weeks are contiguous and start at 1", () => {
    for (const weeks of [5, 10, 18, 24, 30, 36, 48]) {
      const phases = allocatePhases(weeks);
      expect(phases[0]!.startWeek).toBe(1);
      for (let i = 1; i < phases.length; i++) {
        expect(phases[i]!.startWeek).toBe(phases[i - 1]!.endWeek + 1);
      }
    }
  });

  // Repeating mesocycle tests (30+ weeks)

  it("uses repeating mesocycles for 30+ week plans", () => {
    const phases = allocatePhases(30);
    expect(totalWeeksOf(phases)).toBe(30);

    // Should have more than 6 phases (repeated cycles)
    expect(phases.length).toBeGreaterThan(6);

    // First phase is always adaptation
    expect(phases[0]!.phase).toBe("anatomical_adaptation");

    // Last two are always peaking + taper
    expect(phases[phases.length - 2]!.phase).toBe("peaking");
    expect(phases[phases.length - 1]!.phase).toBe("taper");
  });

  it("produces correct totals for 36-week repeating plan", () => {
    const phases = allocatePhases(36);
    expect(totalWeeksOf(phases)).toBe(36);
    expect(phases[0]!.phase).toBe("anatomical_adaptation");
    expect(phases[phases.length - 1]!.phase).toBe("taper");

    // Should have multiple aerobic_base entries (repeated cycles)
    const aeroPhases = phases.filter((p) => p.phase === "aerobic_base");
    expect(aeroPhases.length).toBeGreaterThanOrEqual(2);
  });

  it("produces correct totals for 48-week repeating plan", () => {
    const phases = allocatePhases(48);
    expect(totalWeeksOf(phases)).toBe(48);

    // Should have 3 cycles worth of aerobic_base
    const aeroPhases = phases.filter((p) => p.phase === "aerobic_base");
    expect(aeroPhases.length).toBeGreaterThanOrEqual(3);
  });

  it("no single phase block exceeds 6 weeks in repeating plans", () => {
    for (const weeks of [30, 36, 40, 48, 52]) {
      const phases = allocatePhases(weeks);
      for (const p of phases) {
        const blockLen = p.endWeek - p.startWeek + 1;
        expect(blockLen).toBeLessThanOrEqual(6);
      }
    }
  });

  it("peaking and taper are always the last two phases", () => {
    for (const weeks of [5, 10, 18, 24, 30, 36, 48]) {
      const phases = allocatePhases(weeks);
      expect(phases[phases.length - 1]!.phase).toBe("taper");
      if (phases.length >= 2) {
        expect(phases[phases.length - 2]!.phase).toBe("peaking");
      }
    }
  });
});
