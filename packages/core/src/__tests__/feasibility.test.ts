import { describe, it, expect } from "vitest";
import { checkFeasibility } from "../plan/feasibility.js";
import type { FitnessBaseline } from "../types/profile.js";
import { addWeeks, todayISO } from "../util/dates.js";

const untrained: FitnessBaseline = {
  cooperMeters: 1600,
  pushUps: 8,
  sitUps: 12,
  pullUps: 0,
  standingJumpCm: 160,
  backExtensionReps: 20,
};

const athletic: FitnessBaseline = {
  cooperMeters: 2800,
  pushUps: 38,
  sitUps: 38,
  pullUps: 10,
  standingJumpCm: 220,
  backExtensionReps: 48,
};

const competitive: FitnessBaseline = {
  cooperMeters: 3200,
  pushUps: 50,
  sitUps: 48,
  pullUps: 15,
  standingJumpCm: 240,
  backExtensionReps: 58,
};

function dateInWeeks(weeks: number): string {
  return addWeeks(todayISO(), weeks);
}

describe("checkFeasibility", () => {
  it("flags untrained + basic in 12 weeks as infeasible", () => {
    const result = checkFeasibility(untrained, "basic", dateInWeeks(12));
    expect(result.feasible).toBe(false);
    expect(result.recommendedWeeks).toBeGreaterThan(12);
  });

  it("flags untrained + special_forces in 20 weeks as infeasible", () => {
    const result = checkFeasibility(untrained, "special_forces", dateInWeeks(20));
    expect(result.feasible).toBe(false);
    expect(result.recommendedWeeks).toBeGreaterThan(20);
  });

  it("considers athletic + basic in 16 weeks feasible", () => {
    const result = checkFeasibility(athletic, "basic", dateInWeeks(16));
    expect(result.feasible).toBe(true);
  });

  it("considers competitive + special_forces in 20 weeks feasible", () => {
    const result = checkFeasibility(competitive, "special_forces", dateInWeeks(20));
    expect(result.feasible).toBe(true);
  });

  it("returns a recommended date in the future", () => {
    const result = checkFeasibility(untrained, "basic", dateInWeeks(4));
    expect(result.feasible).toBe(false);
    expect(new Date(result.recommendedDate).getTime()).toBeGreaterThan(Date.now());
  });

  it("identifies the correct bottleneck for untrained → SF", () => {
    // Non-linear model: standing jump 70cm at 0.7cm/wk = 100 weeks (no plyo equipment)
    // or pull-ups 0→12 = 6 + 17.5 + 16 = ~40 weeks
    // or Cooper 1600→3200 with piecewise = many weeks
    // Standing jump should be bottleneck without equipment
    const result = checkFeasibility(untrained, "special_forces", dateInWeeks(10));
    expect(result.bottleneck).toBe("standing jump");
  });

  it("identifies Cooper test as bottleneck when aerobic gap dominates", () => {
    const weakCardio: FitnessBaseline = {
      cooperMeters: 1600,
      pushUps: 45,
      sitUps: 45,
      pullUps: 12,
      standingJumpCm: 230,
      backExtensionReps: 55,
    };
    const result = checkFeasibility(weakCardio, "special_forces", dateInWeeks(10));
    expect(result.bottleneck).toBe("Cooper test");
  });

  it("identifies pull-ups as bottleneck when Cooper is fine but pull-ups are zero", () => {
    const goodCardio: FitnessBaseline = {
      cooperMeters: 3200,
      pushUps: 45,
      sitUps: 45,
      pullUps: 0,
      standingJumpCm: 230,
      backExtensionReps: 55,
    };
    const result = checkFeasibility(goodCardio, "special_forces", dateInWeeks(10));
    expect(result.bottleneck).toBe("pull-ups");
    expect(result.feasible).toBe(false);
  });

  it("is feasible when already at or above target", () => {
    const result = checkFeasibility(competitive, "basic", dateInWeeks(8));
    expect(result.feasible).toBe(true);
    expect(result.recommendedWeeks).toBe(8); // MIN_PLAN_WEEKS
  });

  // Non-linear model specific tests
  it("pull-up 0→1 threshold takes ~6 weeks", () => {
    const zeroPullUps: FitnessBaseline = {
      cooperMeters: 3200,
      pushUps: 50,
      sitUps: 48,
      pullUps: 0,
      standingJumpCm: 240,
      backExtensionReps: 58,
    };
    // 0→4 pull-ups: 6 weeks (0→1) + ceil(3/0.4) = 6 + 8 = 14 weeks + buffer
    const result = checkFeasibility(zeroPullUps, "basic", dateInWeeks(30));
    expect(result.recommendedWeeks).toBeGreaterThanOrEqual(20); // 14 + 6 buffer
    expect(result.bottleneck).toBe("pull-ups");
  });

  it("training background affects recommended weeks", () => {
    const active = checkFeasibility(untrained, "basic", dateInWeeks(40), "currently_active");
    const never = checkFeasibility(untrained, "basic", dateInWeeks(40), "never_trained");
    // Currently active should need fewer weeks than never trained
    expect(active.recommendedWeeks).toBeLessThan(never.recommendedWeeks);
  });

  it("standing jump improves faster with equipment (plyometric proxy)", () => {
    const noEquip = checkFeasibility(untrained, "special_forces", dateInWeeks(200));
    const withEquip = checkFeasibility(untrained, "special_forces", dateInWeeks(200), "deconditioned", ["pull_up_bar"]);
    // Standing jump gap: 70cm. Without plyo: 0.7cm/wk = 100wk. With: 1.5cm/wk = 47wk.
    // Total recommended weeks should be lower with equipment
    expect(withEquip.recommendedWeeks).toBeLessThanOrEqual(noEquip.recommendedWeeks);
  });
});
