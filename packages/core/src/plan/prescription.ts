import type { Exercise, ExercisePrescription } from "../types/exercise.js";
import type { TrainingPhase } from "../types/plan.js";
import { getPrescriptionRange } from "../data/templates.js";

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/**
 * Create an exercise prescription for a given exercise within a training phase.
 * Progress (0-1) indicates how far through the phase we are.
 */
export function prescribe(
  exercise: Exercise,
  phase: TrainingPhase,
  progress: number, // 0.0 = start of phase, 1.0 = end
  isDeload: boolean,
): ExercisePrescription {
  const range = getPrescriptionRange(phase, exercise.category);
  const t = Math.max(0, Math.min(1, progress));

  let sets = lerp(range.sets[0], range.sets[1], t);
  let intensity = lerp(range.intensityPercent[0], range.intensityPercent[1], t);
  const rest = lerp(range.restSeconds[0], range.restSeconds[1], t);

  if (isDeload) {
    sets = Math.max(1, Math.round(sets * 0.6));
    intensity = Math.round(intensity * 0.85);
  }

  const prescription: ExercisePrescription = {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    sets,
    intensityPercent: intensity,
    restSeconds: rest,
  };

  // Assign reps/duration/distance based on modality and template range
  if (exercise.modality === "reps") {
    if (range.reps) {
      prescription.reps = lerp(range.reps[0], range.reps[1], t);
      if (isDeload) prescription.reps = Math.max(1, Math.round(prescription.reps * 0.8));
    } else {
      prescription.reps = isDeload ? 8 : lerp(10, 15, t);
    }
  } else if (exercise.modality === "distance") {
    if (range.distanceKm) {
      prescription.distanceKm = lerp(range.distanceKm[0], range.distanceKm[1], t);
      if (isDeload) prescription.distanceKm = Math.max(1, Math.round(prescription.distanceKm * 0.7));
    } else if (range.durationMinutes) {
      // Distance exercise but template uses time — prescribe by duration instead
      prescription.durationMinutes = lerp(range.durationMinutes[0], range.durationMinutes[1], t);
      if (isDeload) prescription.durationMinutes = Math.max(5, Math.round(prescription.durationMinutes * 0.7));
    } else {
      prescription.distanceKm = isDeload ? 2 : lerp(3, 6, t);
    }
  } else {
    // time modality
    if (range.durationMinutes) {
      prescription.durationMinutes = lerp(range.durationMinutes[0], range.durationMinutes[1], t);
      if (isDeload) prescription.durationMinutes = Math.max(5, Math.round(prescription.durationMinutes * 0.7));
    } else {
      prescription.durationMinutes = isDeload ? 10 : lerp(15, 25, t);
    }
  }

  return prescription;
}

/**
 * Estimate the duration of a prescription in minutes.
 */
export function estimateMinutes(prescription: ExercisePrescription): number {
  if (prescription.durationMinutes) {
    return prescription.durationMinutes * prescription.sets;
  }
  if (prescription.reps) {
    // ~3 seconds per rep + rest between sets
    const workTime = (prescription.reps * 3) / 60;
    const restTime = (prescription.restSeconds * (prescription.sets - 1)) / 60;
    return Math.round((workTime * prescription.sets + restTime) * 10) / 10;
  }
  // Distance-based: rough estimate
  if (prescription.distanceKm) {
    return Math.round(prescription.distanceKm * 7); // ~7 min/km average
  }
  return 10;
}
