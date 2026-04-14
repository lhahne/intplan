import type { ExerciseCategory, ExercisePrescription } from "./exercise.js";
import type { UserProfile, ResolvedProfile } from "./profile.js";
import type { CpfiResult, CpfiTarget } from "./cpfi.js";

export type TrainingPhase =
  | "anatomical_adaptation"
  | "aerobic_base"
  | "strength_build"
  | "strength_endurance"
  | "peaking"
  | "taper";

export interface Macrocycle {
  phase: TrainingPhase;
  startWeek: number;
  endWeek: number;
  description: string;
}

export interface TrainingSession {
  category: ExerciseCategory;
  focus: string;
  exercises: ExercisePrescription[];
  estimatedMinutes: number;
}

export interface TrainingDay {
  dayOfWeek: number; // 0=Monday ... 6=Sunday
  type: "training" | "active_recovery" | "rest";
  focus?: string;
  sessions: TrainingSession[];
  /** Optional light activity suggestion for recovery days */
  suggestion?: string;
}

export interface WeekPlan {
  weekNumber: number;
  phase: TrainingPhase;
  isDeload: boolean;
  trainingDays: number;
  days: TrainingDay[];
}

export interface TrainingPlan {
  profile: UserProfile;
  resolved: ResolvedProfile;
  currentCpfi: CpfiResult;
  targetCpfi: CpfiTarget;
  startDate: string;
  endDate: string;
  totalWeeks: number;
  macrocycles: Macrocycle[];
  weeks: WeekPlan[];
}

export type CategoryEmphasis = Record<ExerciseCategory, number>;
