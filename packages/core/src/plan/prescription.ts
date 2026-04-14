import type { Exercise, ExercisePrescription } from "../types/exercise.js";
import type { TrainingPhase } from "../types/plan.js";
import { getPrescriptionRange } from "../data/templates.js";

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/**
 * Ruck load progression across plan phases.
 * Odd weeks progress distance; even weeks progress load.
 */
function prescribeRuck(
  exercise: Exercise,
  phase: TrainingPhase,
  progress: number,
  isDeload: boolean,
  weekInPlan: number,
): ExercisePrescription {
  const range = getPrescriptionRange(phase, exercise.category);
  const t = Math.max(0, Math.min(1, progress));

  // Load progression: 10→30 kg across plan
  const loadStages = [10, 15, 20, 25, 30];
  const phaseLoadIndex: Record<TrainingPhase, number> = {
    anatomical_adaptation: 0,
    aerobic_base: 1,
    strength_build: 2,
    strength_endurance: 3,
    peaking: 3,
    taper: 2,
  };
  let loadKg = loadStages[phaseLoadIndex[phase]] ?? 15;

  // Distance progression: 3→12 km across plan
  const distanceStages = [3, 5, 8, 10, 12];
  const phaseDistIndex: Record<TrainingPhase, number> = {
    anatomical_adaptation: 0,
    aerobic_base: 1,
    strength_build: 2,
    strength_endurance: 3,
    peaking: 3,
    taper: 1,
  };
  let distanceKm = distanceStages[phaseDistIndex[phase]] ?? 5;

  // Alternate: odd plan-weeks progress distance, even progress load
  // Within the phase, interpolate from the base stage
  if (weekInPlan % 2 === 1) {
    // Distance week: bump distance, hold load at phase base
    distanceKm = Math.round(distanceKm + t * 2);
  } else {
    // Load week: bump load, hold distance at phase base
    loadKg = Math.min(30, loadKg + Math.round(t * 5));
  }

  if (isDeload) {
    loadKg = Math.max(10, Math.round(loadKg * 0.7));
    distanceKm = Math.max(2, Math.round(distanceKm * 0.7));
  }

  const intensity = lerp(range.intensityPercent[0], range.intensityPercent[1], t);

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    sets: 1,
    distanceKm,
    loadKg,
    intensityPercent: isDeload ? Math.round(intensity * 0.85) : intensity,
    restSeconds: 0,
    notes: `${loadKg} kg ruck`,
  };
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
  weekInPlan: number = 1,
): ExercisePrescription {
  // Ruck exercises use dual progression (load + distance)
  if (exercise.category === "ruck_march") {
    return prescribeRuck(exercise, phase, progress, isDeload, weekInPlan);
  }

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

  // RPE-based prescription for circuit/AMRAP work
  if (range.rpeTarget) {
    prescription.rpeTarget = [
      lerp(range.rpeTarget[0], range.rpeTarget[1], t),
      lerp(range.rpeTarget[0], range.rpeTarget[1], Math.min(1, t + 0.3)),
    ];
    if (range.timeCap) {
      prescription.timeCap = lerp(range.timeCap, range.timeCap, t);
    }
    if (isDeload) {
      prescription.rpeTarget = [
        Math.max(4, prescription.rpeTarget[0] - 1),
        Math.max(5, prescription.rpeTarget[1] - 1),
      ];
    }
  }

  // Plyometric ground contacts prescription
  if (exercise.isPlyometric && range.groundContacts) {
    const contacts = lerp(range.groundContacts[0], range.groundContacts[1], t);
    prescription.groundContacts = isDeload
      ? Math.max(10, Math.round(contacts * 0.6))
      : contacts;
    // Derive sets from ground contacts / reps
    const repsPerSet = 8;
    prescription.sets = Math.max(2, Math.ceil(prescription.groundContacts / repsPerSet));
    prescription.reps = repsPerSet;
    return prescription;
  }

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
    // Ruck marches are slower (~10 min/km with load)
    const paceMinPerKm = prescription.loadKg ? 10 : 7;
    return Math.round(prescription.distanceKm * paceMinPerKm);
  }
  return 10;
}
