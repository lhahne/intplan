import type { Equipment } from "./equipment.js";
import type { FitnessBaseline } from "./profile.js";

export type ExerciseCategory =
  | "aerobic_base"
  | "interval_speed"
  | "upper_body_strength"
  | "core_strength"
  | "lower_body_power"
  | "strength_endurance"
  | "ruck_march"
  | "recovery"
  | "mental";

export const ALL_CATEGORIES: ExerciseCategory[] = [
  "aerobic_base",
  "interval_speed",
  "upper_body_strength",
  "core_strength",
  "lower_body_power",
  "strength_endurance",
  "ruck_march",
  "recovery",
  "mental",
];

export type ExerciseModality = "time" | "reps" | "distance";

export interface CpfiRelevance {
  component: keyof FitnessBaseline;
  transferFactor: number; // 0.0-1.0
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  modality: ExerciseModality;
  requiredEquipment: Equipment[];
  muscleGroups: string[];
  cpfiRelevance: CpfiRelevance[];
  difficultyTier: 1 | 2 | 3;
  alternatives?: string[];
}

export interface ExercisePrescription {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps?: number;
  durationMinutes?: number;
  distanceKm?: number;
  intensityPercent: number; // 50-100
  restSeconds: number;
  notes?: string;
}
