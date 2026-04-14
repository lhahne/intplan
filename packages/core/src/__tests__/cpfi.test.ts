import { describe, it, expect } from "vitest";
import { calculateCpfi, calculateComponentScores } from "../cpfi/calculator.js";
import { getCpfiTarget } from "../cpfi/targets.js";
import type { FitnessBaseline } from "../types/profile.js";

describe("calculateComponentScores", () => {
  it("scores all zeros for very low fitness", () => {
    const baseline: FitnessBaseline = {
      cooperMeters: 1500,
      pushUps: 10,
      sitUps: 10,
      pullUps: 0,
      standingJumpCm: 150,
      backExtensionReps: 20,
    };
    const scores = calculateComponentScores(baseline);
    expect(scores.pushUps).toBe(0);
    expect(scores.sitUps).toBe(0);
    expect(scores.pullUps).toBe(0);
    expect(scores.standingJump).toBe(0);
    expect(scores.backExtension).toBe(0);
  });

  it("scores all 3s for excellent fitness", () => {
    const baseline: FitnessBaseline = {
      cooperMeters: 3500,
      pushUps: 50,
      sitUps: 45,
      pullUps: 15,
      standingJumpCm: 240,
      backExtensionReps: 55,
    };
    const scores = calculateComponentScores(baseline);
    expect(scores.pushUps).toBe(3);
    expect(scores.sitUps).toBe(3);
    expect(scores.pullUps).toBe(3);
    expect(scores.standingJump).toBe(3);
    expect(scores.backExtension).toBe(3);
  });

  it("scores intermediate values correctly", () => {
    const baseline: FitnessBaseline = {
      cooperMeters: 2600,
      pushUps: 25,   // score 1
      sitUps: 35,    // score 2
      pullUps: 7,    // score 2
      standingJumpCm: 195, // score 1
      backExtensionReps: 42, // score 2
    };
    const scores = calculateComponentScores(baseline);
    expect(scores.pushUps).toBe(1);
    expect(scores.sitUps).toBe(2);
    expect(scores.pullUps).toBe(2);
    expect(scores.standingJump).toBe(1);
    expect(scores.backExtension).toBe(2);
  });
});

describe("calculateCpfi", () => {
  it("calculates CPFI for a typical conscript", () => {
    const baseline: FitnessBaseline = {
      cooperMeters: 2600,
      pushUps: 30,
      sitUps: 30,
      pullUps: 6,
      standingJumpCm: 200,
      backExtensionReps: 40,
    };
    const result = calculateCpfi(baseline);
    // Cooper class 3, muscle = 2+2+2+2+2 = 10
    // CPFI = (3 + 10) / 3 = 4.3
    expect(result.cooperClass).toBe(3);
    expect(result.muscleFitnessPoints).toBe(10);
    expect(result.cpfi).toBeCloseTo(4.3, 1);
    expect(result.category).toBe("good");
  });

  it("rates poor fitness correctly", () => {
    const baseline: FitnessBaseline = {
      cooperMeters: 1800,
      pushUps: 10,
      sitUps: 10,
      pullUps: 0,
      standingJumpCm: 160,
      backExtensionReps: 20,
    };
    const result = calculateCpfi(baseline);
    expect(result.cpfi).toBeLessThan(2);
    expect(result.category).toBe("poor");
  });

  it("rates excellent fitness correctly", () => {
    const baseline: FitnessBaseline = {
      cooperMeters: 3400,
      pushUps: 50,
      sitUps: 50,
      pullUps: 15,
      standingJumpCm: 240,
      backExtensionReps: 60,
    };
    const result = calculateCpfi(baseline);
    expect(result.cpfi).toBeGreaterThanOrEqual(5);
    expect(result.category).toBe("excellent");
  });
});

describe("getCpfiTarget", () => {
  it("returns correct targets for each service level", () => {
    const basic = getCpfiTarget("basic");
    expect(basic.targetCpfi).toBe(3.5);
    expect(basic.targetCooperMeters).toBe(2600);

    const nco = getCpfiTarget("nco");
    expect(nco.targetCpfi).toBe(4.5);

    const sf = getCpfiTarget("special_forces");
    expect(sf.targetCpfi).toBe(5.5);
    expect(sf.targetCooperMeters).toBe(3200);
  });
});
