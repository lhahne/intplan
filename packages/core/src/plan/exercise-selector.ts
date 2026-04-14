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

// Equipment that gym_full does NOT include — must be selected separately
const GYM_EXCLUDES: Equipment[] = ["sandbag", "battle_rope"];

function equipmentAvailable(exercise: Exercise, available: Equipment[]): boolean {
  if (exercise.requiredEquipment.length === 0) return true;
  const hasGymFull = available.includes("gym_full");
  return exercise.requiredEquipment.every((eq) => {
    if (eq === "bodyweight") return true;
    if (available.includes(eq)) return true;
    // gym_full covers standard gym equipment, but not specialty items
    if (hasGymFull && !GYM_EXCLUDES.includes(eq)) return true;
    return false;
  });
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

/**
 * Score an exercise for selection ranking. Uses a balanced approach:
 * - Base score from muscle group coverage (more muscles = more holistic)
 * - Mild bonus for exercises relevant to weak CPFI components
 * - Equipment variety bonus (barbell/dumbbell exercises scored same as bodyweight)
 *
 * This prevents the selector from always picking the exercise with the
 * highest test transfer factor, which would produce monotonous plans.
 */
function relevanceScore(exercise: Exercise, weakestComponents: (keyof FitnessBaseline)[]): number {
  // Base: reward exercises that work more muscle groups (holistic)
  let score = Math.min(exercise.muscleGroups.length * 0.15, 0.6);

  // Mild CPFI relevance bonus — not dominant
  for (const rel of exercise.cpfiRelevance) {
    const isWeak = weakestComponents.includes(rel.component);
    score += rel.transferFactor * (isWeak ? 0.3 : 0.1);
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

  // Sort by relevance, but use week rotation to ensure variety across weeks.
  // Split into high-relevance (top half) and supporting (bottom half), then
  // pick from each to ensure both direct test-prep and general strength exercises.
  candidates.sort((a, b) => relevanceScore(b, ctx.weakestComponents) - relevanceScore(a, ctx.weakestComponents));

  const count = Math.min(candidates.length, ctx.category === "recovery" || ctx.category === "mental" ? 2 : 3);

  if (candidates.length <= count) return candidates;

  // Rotate through candidates across weeks so different exercises appear each week
  const selected: Exercise[] = [];
  const step = Math.max(1, Math.floor(candidates.length / count));

  for (let i = 0; i < count; i++) {
    const idx = (i * step + ctx.weekInPlan) % candidates.length;
    // Avoid duplicates
    const pick = candidates[idx]!;
    if (!selected.includes(pick)) {
      selected.push(pick);
    }
  }

  // Fill remaining if duplicates were skipped
  for (let i = 0; selected.length < count && i < candidates.length; i++) {
    if (!selected.includes(candidates[i]!)) {
      selected.push(candidates[i]!);
    }
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
