import type { ExerciseCategory } from "../types/exercise.js";
import type { TrainingPhase, CategoryEmphasis } from "../types/plan.js";
import type { FitnessCategory } from "../types/cpfi.js";
import { ALL_CATEGORIES } from "../types/exercise.js";
import { phaseModifiers } from "../data/templates.js";

function normalize(emphasis: CategoryEmphasis): CategoryEmphasis {
  const total = Object.values(emphasis).reduce((a, b) => a + b, 0);
  if (total === 0) return emphasis;
  const result = {} as CategoryEmphasis;
  for (const cat of ALL_CATEGORIES) {
    result[cat] = emphasis[cat] / total;
  }
  return result;
}

/**
 * Compute the weekly category emphasis for a given phase,
 * by applying phase modifiers to the base (gap-derived) emphasis.
 */
export function weeklyEmphasis(
  baseEmphasis: CategoryEmphasis,
  phase: TrainingPhase,
): CategoryEmphasis {
  const modifiers = phaseModifiers[phase];
  const modified = {} as CategoryEmphasis;

  for (const cat of ALL_CATEGORIES) {
    modified[cat] = baseEmphasis[cat] * modifiers[cat];
  }

  return normalize(modified);
}

/**
 * Base training days by fitness level. Unfit people need more recovery;
 * fit people can handle higher frequency.
 */
const baseDaysByFitness: Record<FitnessCategory, number> = {
  poor: 3,
  fair: 3,
  satisfactory: 4,
  good: 5,
  excellent: 5,
};

/**
 * Phase multiplier on training days. Early phases are lighter;
 * peak phases are higher frequency but taper drops back down.
 */
const phaseVolumeMultiplier: Record<TrainingPhase, number> = {
  anatomical_adaptation: 0.85,
  aerobic_base: 0.95,
  strength_build: 1.0,
  strength_endurance: 1.05,
  peaking: 1.0,
  taper: 0.7,
};

/**
 * Compute training days for a specific week, based on:
 * - Current fitness category (base capacity)
 * - Training phase (volume demands)
 * - Plan progress (gradual ramp-up within first few weeks)
 * - User's max willingness (hard cap)
 * - Deload flag (reduce days)
 */
export function computeTrainingDays(
  fitnessCategory: FitnessCategory,
  phase: TrainingPhase,
  weekInPlan: number,
  totalWeeks: number,
  maxTrainingDays: number,
  isDeload: boolean,
): number {
  const base = baseDaysByFitness[fitnessCategory];
  const phaseMult = phaseVolumeMultiplier[phase];

  // Gradual ramp-up: first 3 weeks, scale from 0.75 to 1.0
  const rampUp = weekInPlan <= 2 ? 0.75 + (weekInPlan / 2) * 0.25 : 1.0;

  // Progressive overload: slight increase as plan progresses (up to +1 day)
  const planProgress = totalWeeks > 1 ? weekInPlan / (totalWeeks - 1) : 0;
  const progressBonus = planProgress * 0.8;

  let days = Math.round((base + progressBonus) * phaseMult * rampUp);

  if (isDeload) {
    days = Math.max(2, days - 1);
  }

  // Clamp to 2..maxTrainingDays
  return Math.max(2, Math.min(maxTrainingDays, days));
}

/**
 * Convert category emphasis into session counts for the week.
 * Each training day gets 1-2 sessions (categories).
 * Returns how many sessions of each category to include this week.
 */
export function allocateSessions(
  emphasis: CategoryEmphasis,
  trainingDays: number,
): Record<ExerciseCategory, number> {
  // Total session slots: each day ~1.5 sessions average
  const totalSlots = Math.round(trainingDays * 1.5);

  const raw = {} as Record<ExerciseCategory, number>;
  let assigned = 0;

  // First pass: floor allocation
  for (const cat of ALL_CATEGORIES) {
    raw[cat] = Math.floor(emphasis[cat] * totalSlots);
    assigned += raw[cat];
  }

  // Distribute remaining slots to highest-emphasis categories
  const remaining = totalSlots - assigned;
  const sorted = [...ALL_CATEGORIES].sort((a, b) => emphasis[b] - emphasis[a]);

  for (let i = 0; i < remaining && i < sorted.length; i++) {
    raw[sorted[i]!]++;
  }

  // Ensure at least one aerobic and one strength session per week
  if (raw.aerobic_base === 0 && raw.interval_speed === 0) {
    raw.aerobic_base = 1;
    // Remove from lowest priority
    const lowest = sorted[sorted.length - 1]!;
    if (raw[lowest] > 0) raw[lowest]--;
  }

  return raw;
}
