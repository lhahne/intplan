// Types
export type { Equipment } from "./types/equipment.js";
export type {
  FitnessBaseline,
  FitnessEstimate,
  FitnessInput,
  TrainingBackground,
  UserProfile,
  ResolvedProfile,
} from "./types/profile.js";
export type {
  FitnessCategory,
  ServiceLevel,
  CpfiResult,
  CpfiTarget,
  ComponentScores,
} from "./types/cpfi.js";
export type {
  ExerciseCategory,
  ExerciseModality,
  Exercise,
  ExercisePrescription,
} from "./types/exercise.js";
export { ALL_CATEGORIES } from "./types/exercise.js";
export type {
  TrainingPhase,
  Macrocycle,
  TrainingSession,
  TrainingDay,
  WeekPlan,
  TrainingPlan,
  CategoryEmphasis,
} from "./types/plan.js";

// CPFI
export { calculateCpfi, calculateComponentScores } from "./cpfi/calculator.js";
export { getCpfiTarget } from "./cpfi/targets.js";
export { resolveBaseline, resolveProfile, estimateBaselines } from "./cpfi/estimates.js";

// Plan generation
export { generatePlan } from "./plan/generator.js";
export { analyzeGaps } from "./plan/gap-analysis.js";
export { allocatePhases } from "./plan/periodization.js";
export { checkFeasibility } from "./plan/feasibility.js";
export type { FeasibilityResult } from "./plan/feasibility.js";
