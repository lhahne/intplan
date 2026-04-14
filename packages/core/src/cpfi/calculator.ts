import type { FitnessBaseline } from "../types/profile.js";
import type { CpfiResult, FitnessCategory, ComponentScores } from "../types/cpfi.js";
import {
  pushUpScoring,
  sitUpScoring,
  pullUpScoring,
  standingJumpScoring,
  backExtensionScoring,
  scoreTest,
  cooperClass,
} from "../data/scoring.js";

function categoryFromCpfi(cpfi: number): FitnessCategory {
  if (cpfi >= 5.0) return "excellent";
  if (cpfi >= 4.0) return "good";
  if (cpfi >= 3.0) return "satisfactory";
  if (cpfi >= 2.0) return "fair";
  return "poor";
}

export function calculateComponentScores(baseline: FitnessBaseline): ComponentScores {
  return {
    pushUps: scoreTest(baseline.pushUps, pushUpScoring),
    sitUps: scoreTest(baseline.sitUps, sitUpScoring),
    pullUps: scoreTest(baseline.pullUps, pullUpScoring),
    standingJump: scoreTest(baseline.standingJumpCm, standingJumpScoring),
    backExtension: scoreTest(baseline.backExtensionReps, backExtensionScoring),
  };
}

export function calculateCpfi(baseline: FitnessBaseline): CpfiResult {
  const componentScores = calculateComponentScores(baseline);
  const muscleFitnessPoints =
    componentScores.pushUps +
    componentScores.sitUps +
    componentScores.pullUps +
    componentScores.standingJump +
    componentScores.backExtension;

  const cooper = cooperClass(baseline.cooperMeters);

  // CPFI = (cooperClass + muscleFitnessIndex) / 3
  // where muscleFitnessIndex = sum of 5 test classes (0-15)
  // and cooperClass is 0-5
  // This gives a range of 0-6.67, with typical values 1-6
  const cpfi = (cooper + muscleFitnessPoints) / 3;

  return {
    cooperMeters: baseline.cooperMeters,
    cooperClass: cooper,
    muscleFitnessPoints,
    componentScores,
    cpfi: Math.round(cpfi * 10) / 10,
    category: categoryFromCpfi(cpfi),
  };
}
