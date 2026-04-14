export type FitnessCategory = "excellent" | "good" | "satisfactory" | "fair" | "poor";

export type ServiceLevel = "basic" | "nco" | "special_forces";

export interface ComponentScores {
  pushUps: number;
  sitUps: number;
  pullUps: number;
  standingJump: number;
  backExtension: number;
}

export interface CpfiResult {
  cooperMeters: number;
  cooperClass: number;
  muscleFitnessPoints: number;
  componentScores: ComponentScores;
  cpfi: number;
  category: FitnessCategory;
}

export interface CpfiTarget {
  minCpfi: number;
  targetCpfi: number;
  minCooperMeters: number;
  targetCooperMeters: number;
  minMuscleFitnessPoints: number;
  targetMuscleFitnessPoints: number;
  componentTargets: {
    pushUps: number;
    sitUps: number;
    pullUps: number;
    standingJumpCm: number;
    backExtensionReps: number;
  };
}
