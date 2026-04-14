import type { FitnessBaseline } from "../types/profile.js";
import type { CpfiTarget } from "../types/cpfi.js";
import type { ExerciseCategory } from "../types/exercise.js";
import type { TrainingPhase, CategoryEmphasis } from "../types/plan.js";
import { ALL_CATEGORIES } from "../types/exercise.js";

/**
 * Holistic training emphasis for military service preparation.
 * This is the baseline distribution that produces a well-rounded soldier,
 * not an optimized test-taker. Training should build general physical
 * preparedness — test scores follow from real fitness.
 */
const holisticEmphasis: CategoryEmphasis = {
  aerobic_base: 0.18,
  interval_speed: 0.08,
  upper_body_strength: 0.14,
  core_strength: 0.10,
  lower_body_power: 0.12,
  strength_endurance: 0.13,
  ruck_march: 0.08,
  recovery: 0.09,
  mental: 0.08,
};

/**
 * How much the gap analysis is allowed to shift emphasis away from
 * the holistic baseline. Capped to prevent test-chasing.
 * In peaking phase, test-specific adjustment is stronger.
 */
const MAX_GAP_SHIFT = 0.06;

// Map fitness components to the exercise categories that address them
const componentToCategories: Record<keyof FitnessBaseline, ExerciseCategory[]> = {
  cooperMeters: ["aerobic_base", "interval_speed"],
  pushUps: ["upper_body_strength", "strength_endurance"],
  sitUps: ["core_strength", "strength_endurance"],
  pullUps: ["upper_body_strength"],
  standingJumpCm: ["lower_body_power"],
  backExtensionReps: ["core_strength"],
};

function normalize(emphasis: CategoryEmphasis): CategoryEmphasis {
  const total = Object.values(emphasis).reduce((a, b) => a + b, 0);
  if (total === 0) return { ...holisticEmphasis };
  const result = {} as CategoryEmphasis;
  for (const cat of ALL_CATEGORIES) {
    result[cat] = emphasis[cat] / total;
  }
  return result;
}

/**
 * Analyze fitness gaps and produce a category emphasis that balances
 * holistic training with targeted weakness correction.
 *
 * The emphasis starts from a holistic baseline designed for military
 * readiness (not test optimization). Gaps in specific test components
 * produce a mild shift — enough to address real weaknesses, not enough
 * to turn the plan into a test-prep routine.
 *
 * @param phase - Current training phase. Peaking phase allows stronger
 *   test-specific adjustment since that's when test prep is appropriate.
 */
export function analyzeGaps(
  current: FitnessBaseline,
  target: CpfiTarget,
  phase?: TrainingPhase,
): CategoryEmphasis {
  const gaps: { component: keyof FitnessBaseline; gapRatio: number }[] = [
    { component: "cooperMeters", gapRatio: 0 },
    { component: "pushUps", gapRatio: 0 },
    { component: "sitUps", gapRatio: 0 },
    { component: "pullUps", gapRatio: 0 },
    { component: "standingJumpCm", gapRatio: 0 },
    { component: "backExtensionReps", gapRatio: 0 },
  ];

  for (const gap of gaps) {
    const curr = current[gap.component];
    const tgt =
      gap.component === "cooperMeters"
        ? target.targetCooperMeters
        : target.componentTargets[gap.component as keyof typeof target.componentTargets];
    if (tgt > 0 && curr < tgt) {
      gap.gapRatio = (tgt - curr) / tgt;
    }
  }

  // Start from holistic baseline
  const emphasis = { ...holisticEmphasis };

  // Allow more test-specific shift during peaking, less during base building
  const maxShift = phase === "peaking" ? MAX_GAP_SHIFT * 2.5 : MAX_GAP_SHIFT;

  for (const gap of gaps) {
    if (gap.gapRatio <= 0.15) continue; // only adjust for meaningful gaps

    const shift = Math.min(gap.gapRatio * 0.08, maxShift);
    const categories = componentToCategories[gap.component];

    for (const cat of categories) {
      emphasis[cat] += shift / categories.length;
    }
  }

  // Floor: no category drops below a minimum to ensure holistic training
  const minEmphasis: Partial<Record<ExerciseCategory, number>> = {
    ruck_march: 0.04,
    recovery: 0.06,
    mental: 0.05,
    lower_body_power: 0.06,
    core_strength: 0.06,
  };

  for (const [cat, min] of Object.entries(minEmphasis)) {
    emphasis[cat as ExerciseCategory] = Math.max(emphasis[cat as ExerciseCategory], min);
  }

  return normalize(emphasis);
}
