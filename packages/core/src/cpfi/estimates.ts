import type { FitnessBaseline, FitnessEstimate, FitnessInput, UserProfile, ResolvedProfile } from "../types/profile.js";

/**
 * Representative fitness baselines for each self-assessment level.
 * Based on typical Finnish male 18-25 year old population data.
 */
const estimateBaselines: Record<FitnessEstimate, FitnessBaseline> = {
  untrained: {
    cooperMeters: 1600,
    pushUps: 8,
    sitUps: 12,
    pullUps: 0,
    standingJumpCm: 160,
    backExtensionReps: 20,
  },
  beginner: {
    cooperMeters: 2000,
    pushUps: 18,
    sitUps: 20,
    pullUps: 2,
    standingJumpCm: 180,
    backExtensionReps: 30,
  },
  moderate: {
    cooperMeters: 2400,
    pushUps: 28,
    sitUps: 30,
    pullUps: 5,
    standingJumpCm: 200,
    backExtensionReps: 38,
  },
  athletic: {
    cooperMeters: 2800,
    pushUps: 38,
    sitUps: 38,
    pullUps: 10,
    standingJumpCm: 220,
    backExtensionReps: 48,
  },
  competitive: {
    cooperMeters: 3200,
    pushUps: 50,
    sitUps: 48,
    pullUps: 15,
    standingJumpCm: 240,
    backExtensionReps: 58,
  },
};

/**
 * Resolve a FitnessInput to a concrete FitnessBaseline.
 * For estimates, starts from the level's representative values
 * and applies any user-provided overrides.
 */
export function resolveBaseline(input: FitnessInput): FitnessBaseline {
  if (input.type === "tested") {
    return input.baseline;
  }

  const base = { ...estimateBaselines[input.level] };

  if (input.overrides) {
    for (const [key, value] of Object.entries(input.overrides)) {
      if (value !== undefined) {
        (base as Record<string, number>)[key] = value;
      }
    }
  }

  return base;
}

/**
 * Resolve a UserProfile (which may contain estimated fitness) into
 * a ResolvedProfile with concrete baseline numbers.
 */
export function resolveProfile(profile: UserProfile): ResolvedProfile {
  return {
    name: profile.name,
    serviceDate: profile.serviceDate,
    targetServiceLevel: profile.targetServiceLevel,
    maxTrainingDays: profile.maxTrainingDays,
    availableEquipment: profile.availableEquipment,
    currentFitness: resolveBaseline(profile.fitnessInput),
    injuries: profile.injuries,
  };
}

export { estimateBaselines };
