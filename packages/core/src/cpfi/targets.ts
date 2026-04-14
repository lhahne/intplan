import type { ServiceLevel, CpfiTarget } from "../types/cpfi.js";

const targetsByLevel: Record<ServiceLevel, CpfiTarget> = {
  basic: {
    minCpfi: 2.5,
    targetCpfi: 3.5,
    minCooperMeters: 2200,
    targetCooperMeters: 2600,
    minMuscleFitnessPoints: 6,
    targetMuscleFitnessPoints: 9,
    componentTargets: {
      pushUps: 30,
      sitUps: 30,
      pullUps: 4,
      standingJumpCm: 200,
      backExtensionReps: 40,
    },
  },
  nco: {
    minCpfi: 3.5,
    targetCpfi: 4.5,
    minCooperMeters: 2600,
    targetCooperMeters: 2900,
    minMuscleFitnessPoints: 9,
    targetMuscleFitnessPoints: 12,
    componentTargets: {
      pushUps: 35,
      sitUps: 35,
      pullUps: 8,
      standingJumpCm: 210,
      backExtensionReps: 45,
    },
  },
  special_forces: {
    minCpfi: 4.5,
    targetCpfi: 5.5,
    minCooperMeters: 3000,
    targetCooperMeters: 3200,
    minMuscleFitnessPoints: 12,
    targetMuscleFitnessPoints: 14,
    componentTargets: {
      pushUps: 45,
      sitUps: 45,
      pullUps: 12,
      standingJumpCm: 230,
      backExtensionReps: 55,
    },
  },
};

export function getCpfiTarget(level: ServiceLevel): CpfiTarget {
  return targetsByLevel[level];
}
