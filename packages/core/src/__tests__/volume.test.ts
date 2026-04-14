import { describe, it, expect } from "vitest";
import { computeTrainingDays } from "../plan/volume.js";

describe("computeTrainingDays", () => {
  it("poor fitness gets fewer days than excellent", () => {
    const poor = computeTrainingDays("poor", "aerobic_base", 10, 24, 6, false);
    const excellent = computeTrainingDays("excellent", "aerobic_base", 10, 24, 6, false);
    expect(poor).toBeLessThanOrEqual(excellent);
  });

  it("never exceeds maxTrainingDays", () => {
    const days = computeTrainingDays("excellent", "strength_endurance", 20, 24, 4, false);
    expect(days).toBeLessThanOrEqual(4);
  });

  it("deload reduces training days", () => {
    const normal = computeTrainingDays("satisfactory", "strength_build", 10, 24, 6, false);
    const deload = computeTrainingDays("satisfactory", "strength_build", 10, 24, 6, true);
    expect(deload).toBeLessThanOrEqual(normal);
  });

  it("taper phase has fewer days", () => {
    const build = computeTrainingDays("good", "strength_build", 20, 24, 6, false);
    const taper = computeTrainingDays("good", "taper", 23, 24, 6, false);
    expect(taper).toBeLessThanOrEqual(build);
  });

  it("early weeks ramp up (fewer days at start)", () => {
    const week1 = computeTrainingDays("satisfactory", "aerobic_base", 0, 24, 6, false);
    const week8 = computeTrainingDays("satisfactory", "aerobic_base", 7, 24, 6, false);
    expect(week1).toBeLessThanOrEqual(week8);
  });

  it("always returns at least 2", () => {
    const days = computeTrainingDays("poor", "taper", 0, 4, 3, true);
    expect(days).toBeGreaterThanOrEqual(2);
  });
});
