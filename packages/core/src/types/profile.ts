import type { Equipment } from "./equipment.js";
import type { ServiceLevel } from "./cpfi.js";

export interface FitnessBaseline {
  cooperMeters: number;
  pushUps: number;
  sitUps: number;
  pullUps: number;
  standingJumpCm: number;
  backExtensionReps: number;
}

/**
 * Rough self-assessment levels for people who haven't done formal testing.
 * Each level maps to representative FitnessBaseline values.
 */
export type FitnessEstimate = "untrained" | "beginner" | "moderate" | "athletic" | "competitive";

/**
 * Fitness input: either exact test results or a rough self-assessment.
 * When using an estimate, individual overrides can be provided for
 * any components the user does know (e.g. "moderate but I can do 40 push-ups").
 */
export type FitnessInput =
  | { type: "tested"; baseline: FitnessBaseline }
  | { type: "estimated"; level: FitnessEstimate; overrides?: Partial<FitnessBaseline> };

export type TrainingBackground = "never_trained" | "deconditioned" | "currently_active";

export interface UserProfile {
  name?: string;
  serviceDate: string; // ISO date e.g. "2027-01-08"
  targetServiceLevel: ServiceLevel;
  /** Max training days the user is willing/able to commit to per week. */
  maxTrainingDays: 3 | 4 | 5 | 6;
  availableEquipment: Equipment[];
  fitnessInput: FitnessInput;
  trainingBackground?: TrainingBackground;
  injuries?: string[];
}

/** Resolved profile with concrete baseline — used internally after resolving estimates. */
export interface ResolvedProfile {
  name?: string;
  serviceDate: string;
  targetServiceLevel: ServiceLevel;
  maxTrainingDays: 3 | 4 | 5 | 6;
  availableEquipment: Equipment[];
  currentFitness: FitnessBaseline;
  trainingBackground: TrainingBackground;
  injuries?: string[];
}
