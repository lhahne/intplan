import type { TrainingPhase } from "../types/plan.js";
import type { ExerciseCategory } from "../types/exercise.js";

// ---------- Phase modifiers ----------
// Multipliers applied to base category emphasis for each training phase.

export const phaseModifiers: Record<
  TrainingPhase,
  Record<ExerciseCategory, number>
> = {
  // Build movement patterns, joint resilience, habits. Light rucking starts here.
  anatomical_adaptation: {
    aerobic_base: 1.2,
    interval_speed: 0.2,
    upper_body_strength: 0.9,
    core_strength: 1.2,
    lower_body_power: 0.8,
    strength_endurance: 0.4,
    ruck_march: 0.5,
    recovery: 1.3,
    mental: 1.2,
  },
  // Aerobic foundation. Maintain strength, introduce ruck volume, build mental habits.
  aerobic_base: {
    aerobic_base: 1.4,
    interval_speed: 0.5,
    upper_body_strength: 0.8,
    core_strength: 1.0,
    lower_body_power: 0.7,
    strength_endurance: 0.5,
    ruck_march: 0.8,
    recovery: 1.0,
    mental: 1.0,
  },
  // Build maximal strength. Keep aerobic base, progress ruck loads.
  strength_build: {
    aerobic_base: 0.7,
    interval_speed: 0.4,
    upper_body_strength: 1.4,
    core_strength: 1.0,
    lower_body_power: 1.4,
    strength_endurance: 0.5,
    ruck_march: 0.7,
    recovery: 1.0,
    mental: 0.8,
  },
  // High work capacity. Circuits, ruck marches, mental toughness.
  strength_endurance: {
    aerobic_base: 0.7,
    interval_speed: 0.6,
    upper_body_strength: 0.9,
    core_strength: 1.0,
    lower_body_power: 0.9,
    strength_endurance: 1.5,
    ruck_march: 1.2,
    recovery: 0.8,
    mental: 1.0,
  },
  // Sport-specific test prep. Only phase where test optimization is appropriate.
  peaking: {
    aerobic_base: 0.7,
    interval_speed: 1.4,
    upper_body_strength: 1.0,
    core_strength: 0.9,
    lower_body_power: 0.9,
    strength_endurance: 1.0,
    ruck_march: 0.5,
    recovery: 1.0,
    mental: 1.2,
  },
  // Reduce volume, maintain readiness, mental prep for service start.
  taper: {
    aerobic_base: 0.5,
    interval_speed: 0.3,
    upper_body_strength: 0.5,
    core_strength: 0.5,
    lower_body_power: 0.5,
    strength_endurance: 0.3,
    ruck_march: 0.3,
    recovery: 1.8,
    mental: 1.5,
  },
};

// ---------- Prescription ranges ----------

export interface PrescriptionRange {
  sets: [number, number];
  reps?: [number, number];
  durationMinutes?: [number, number];
  distanceKm?: [number, number];
  intensityPercent: [number, number];
  restSeconds: [number, number];
}

export const defaultPrescriptionRange: PrescriptionRange = {
  sets: [2, 4],
  reps: [8, 12],
  intensityPercent: [60, 75],
  restSeconds: [60, 90],
};

type PhaseCategory = `${TrainingPhase}:${ExerciseCategory}`;

export const prescriptionRanges: Partial<
  Record<PhaseCategory, PrescriptionRange>
> = {
  // --- Anatomical Adaptation ---
  "anatomical_adaptation:upper_body_strength": {
    sets: [2, 3],
    reps: [12, 15],
    intensityPercent: [50, 60],
    restSeconds: [60, 60],
  },
  "anatomical_adaptation:core_strength": {
    sets: [2, 3],
    reps: [15, 20],
    intensityPercent: [50, 60],
    restSeconds: [45, 60],
  },
  "anatomical_adaptation:lower_body_power": {
    sets: [2, 3],
    reps: [12, 15],
    intensityPercent: [50, 60],
    restSeconds: [60, 90],
  },
  "anatomical_adaptation:aerobic_base": {
    sets: [1, 1],
    durationMinutes: [20, 35],
    intensityPercent: [50, 65],
    restSeconds: [0, 0],
  },
  "anatomical_adaptation:recovery": {
    sets: [1, 1],
    durationMinutes: [15, 25],
    intensityPercent: [30, 40],
    restSeconds: [0, 0],
  },

  // --- Aerobic Base ---
  "aerobic_base:aerobic_base": {
    sets: [1, 1],
    durationMinutes: [25, 55],
    intensityPercent: [55, 70],
    restSeconds: [0, 0],
  },
  "aerobic_base:interval_speed": {
    sets: [4, 6],
    durationMinutes: [3, 5],
    intensityPercent: [75, 85],
    restSeconds: [60, 90],
  },
  "aerobic_base:upper_body_strength": {
    sets: [2, 3],
    reps: [10, 15],
    intensityPercent: [55, 65],
    restSeconds: [60, 90],
  },
  "aerobic_base:core_strength": {
    sets: [2, 3],
    reps: [12, 20],
    intensityPercent: [55, 65],
    restSeconds: [45, 60],
  },
  "aerobic_base:recovery": {
    sets: [1, 1],
    durationMinutes: [20, 30],
    intensityPercent: [30, 45],
    restSeconds: [0, 0],
  },

  // --- Strength Build ---
  "strength_build:upper_body_strength": {
    sets: [3, 5],
    reps: [6, 10],
    intensityPercent: [70, 85],
    restSeconds: [90, 120],
  },
  "strength_build:lower_body_power": {
    sets: [3, 5],
    reps: [5, 8],
    intensityPercent: [70, 85],
    restSeconds: [90, 120],
  },
  "strength_build:core_strength": {
    sets: [3, 4],
    reps: [8, 12],
    intensityPercent: [65, 80],
    restSeconds: [60, 90],
  },
  "strength_build:aerobic_base": {
    sets: [1, 1],
    durationMinutes: [25, 45],
    intensityPercent: [55, 70],
    restSeconds: [0, 0],
  },
  "strength_build:recovery": {
    sets: [1, 1],
    durationMinutes: [15, 25],
    intensityPercent: [30, 40],
    restSeconds: [0, 0],
  },

  // --- Strength Endurance ---
  "strength_endurance:strength_endurance": {
    sets: [3, 5],
    reps: [15, 25],
    intensityPercent: [50, 65],
    restSeconds: [30, 60],
  },
  "strength_endurance:upper_body_strength": {
    sets: [3, 4],
    reps: [10, 15],
    intensityPercent: [60, 75],
    restSeconds: [60, 90],
  },
  "strength_endurance:lower_body_power": {
    sets: [3, 4],
    reps: [10, 15],
    intensityPercent: [60, 75],
    restSeconds: [60, 90],
  },
  "strength_endurance:aerobic_base": {
    sets: [1, 1],
    durationMinutes: [30, 50],
    intensityPercent: [60, 75],
    restSeconds: [0, 0],
  },
  "strength_endurance:ruck_march": {
    sets: [1, 1],
    distanceKm: [5, 12],
    durationMinutes: [40, 90],
    intensityPercent: [55, 70],
    restSeconds: [0, 0],
  },
  "strength_endurance:recovery": {
    sets: [1, 1],
    durationMinutes: [15, 25],
    intensityPercent: [30, 40],
    restSeconds: [0, 0],
  },

  // --- Peaking ---
  "peaking:interval_speed": {
    sets: [4, 8],
    durationMinutes: [2, 4],
    intensityPercent: [85, 95],
    restSeconds: [60, 90],
  },
  "peaking:upper_body_strength": {
    sets: [3, 5],
    reps: [3, 6],
    intensityPercent: [80, 95],
    restSeconds: [120, 180],
  },
  "peaking:lower_body_power": {
    sets: [3, 5],
    reps: [3, 5],
    intensityPercent: [80, 95],
    restSeconds: [120, 180],
  },
  "peaking:aerobic_base": {
    sets: [1, 1],
    durationMinutes: [30, 50],
    intensityPercent: [60, 75],
    restSeconds: [0, 0],
  },
  "peaking:strength_endurance": {
    sets: [3, 4],
    reps: [12, 20],
    intensityPercent: [55, 70],
    restSeconds: [30, 60],
  },
  "peaking:mental": {
    sets: [1, 1],
    durationMinutes: [10, 20],
    intensityPercent: [40, 60],
    restSeconds: [0, 0],
  },
  "peaking:recovery": {
    sets: [1, 1],
    durationMinutes: [15, 25],
    intensityPercent: [30, 40],
    restSeconds: [0, 0],
  },

  // --- Taper ---
  "taper:aerobic_base": {
    sets: [1, 1],
    durationMinutes: [15, 25],
    intensityPercent: [50, 60],
    restSeconds: [0, 0],
  },
  "taper:upper_body_strength": {
    sets: [2, 3],
    reps: [5, 8],
    intensityPercent: [65, 75],
    restSeconds: [90, 120],
  },
  "taper:recovery": {
    sets: [1, 1],
    durationMinutes: [20, 35],
    intensityPercent: [25, 40],
    restSeconds: [0, 0],
  },
  "taper:mental": {
    sets: [1, 1],
    durationMinutes: [10, 20],
    intensityPercent: [30, 50],
    restSeconds: [0, 0],
  },
};

/**
 * Look up the prescription range for a phase+category combo,
 * falling back to the default if not explicitly defined.
 */
export function getPrescriptionRange(
  phase: TrainingPhase,
  category: ExerciseCategory,
): PrescriptionRange {
  const key = `${phase}:${category}` as PhaseCategory;
  return prescriptionRanges[key] ?? defaultPrescriptionRange;
}
