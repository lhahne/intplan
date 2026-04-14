import type { Exercise, ExerciseCategory } from "../types/exercise.js";
import type { Equipment } from "../types/equipment.js";
import type { TrainingPhase } from "../types/plan.js";
import type { FitnessBaseline } from "../types/profile.js";
import { exercises as exerciseDb } from "../data/exercises.js";

interface SelectionContext {
  category: ExerciseCategory;
  phase: TrainingPhase;
  equipment: Equipment[];
  weekInPlan: number;
  totalWeeks: number;
  weakestComponents: (keyof FitnessBaseline)[];
}

function equipmentAvailable(exercise: Exercise, available: Equipment[]): boolean {
  if (exercise.requiredEquipment.length === 0) return true;
  // "bodyweight" is always available
  return exercise.requiredEquipment.every(
    (eq) => eq === "bodyweight" || available.includes(eq),
  );
}

function difficultyAllowed(
  tier: 1 | 2 | 3,
  weekInPlan: number,
  totalWeeks: number,
): boolean {
  const progress = totalWeeks > 0 ? weekInPlan / totalWeeks : 0;
  if (progress < 0.25) return tier <= 2;
  if (progress > 0.75) return tier >= 2;
  return true;
}

function relevanceScore(exercise: Exercise, weakestComponents: (keyof FitnessBaseline)[]): number {
  let score = 0;
  for (const rel of exercise.cpfiRelevance) {
    const isWeak = weakestComponents.includes(rel.component);
    score += rel.transferFactor * (isWeak ? 2.0 : 1.0);
  }
  return score;
}

/**
 * Select exercises for a given category, filtered and ranked for the context.
 * Returns 2-4 exercises.
 */
export function selectExercises(ctx: SelectionContext): Exercise[] {
  const candidates = exerciseDb.filter((ex) => {
    if (ex.category !== ctx.category) return false;
    if (!equipmentAvailable(ex, ctx.equipment)) return false;
    if (!difficultyAllowed(ex.difficultyTier, ctx.weekInPlan, ctx.totalWeeks)) return false;
    return true;
  });

  if (candidates.length === 0) {
    // Fallback: relax difficulty filter
    const relaxed = exerciseDb.filter(
      (ex) => ex.category === ctx.category && equipmentAvailable(ex, ctx.equipment),
    );
    if (relaxed.length === 0) return [];
    return relaxed.slice(0, 2);
  }

  // Sort by relevance to weakest components
  candidates.sort((a, b) => relevanceScore(b, ctx.weakestComponents) - relevanceScore(a, ctx.weakestComponents));

  // Use week number to rotate selection within candidates
  const count = Math.min(candidates.length, ctx.category === "recovery" || ctx.category === "mental" ? 2 : 3);
  const offset = ctx.weekInPlan % Math.max(1, candidates.length - count + 1);

  const selected: Exercise[] = [];
  for (let i = 0; i < count && i + offset < candidates.length; i++) {
    selected.push(candidates[i + offset]!);
  }

  // Ensure we have at least 1
  if (selected.length === 0 && candidates.length > 0) {
    selected.push(candidates[0]!);
  }

  return selected;
}

/**
 * Determine the weakest fitness components based on gap ratios.
 */
export function findWeakestComponents(
  current: FitnessBaseline,
  targets: { pushUps: number; sitUps: number; pullUps: number; standingJumpCm: number; backExtensionReps: number },
  cooperTarget: number,
): (keyof FitnessBaseline)[] {
  const gaps: { component: keyof FitnessBaseline; ratio: number }[] = [
    { component: "cooperMeters", ratio: cooperTarget > 0 ? (cooperTarget - current.cooperMeters) / cooperTarget : 0 },
    { component: "pushUps", ratio: targets.pushUps > 0 ? (targets.pushUps - current.pushUps) / targets.pushUps : 0 },
    { component: "sitUps", ratio: targets.sitUps > 0 ? (targets.sitUps - current.sitUps) / targets.sitUps : 0 },
    { component: "pullUps", ratio: targets.pullUps > 0 ? (targets.pullUps - current.pullUps) / targets.pullUps : 0 },
    { component: "standingJumpCm", ratio: targets.standingJumpCm > 0 ? (targets.standingJumpCm - current.standingJumpCm) / targets.standingJumpCm : 0 },
    { component: "backExtensionReps", ratio: targets.backExtensionReps > 0 ? (targets.backExtensionReps - current.backExtensionReps) / targets.backExtensionReps : 0 },
  ];

  return gaps
    .filter((g) => g.ratio > 0.1)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3)
    .map((g) => g.component);
}
