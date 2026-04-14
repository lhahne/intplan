import type { FitnessBaseline } from "../types/profile.js";
import type { CpfiTarget } from "../types/cpfi.js";
import type { ExerciseCategory } from "../types/exercise.js";
import type { CategoryEmphasis } from "../types/plan.js";
import { ALL_CATEGORIES } from "../types/exercise.js";

interface ComponentGap {
  component: keyof FitnessBaseline;
  current: number;
  target: number;
  gapRatio: number; // 0-1, how far below target
}

const defaultEmphasis: CategoryEmphasis = {
  aerobic_base: 0.20,
  interval_speed: 0.10,
  upper_body_strength: 0.15,
  core_strength: 0.10,
  lower_body_power: 0.10,
  strength_endurance: 0.15,
  ruck_march: 0.05,
  recovery: 0.10,
  mental: 0.05,
};

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
  if (total === 0) return { ...defaultEmphasis };
  const result = {} as CategoryEmphasis;
  for (const cat of ALL_CATEGORIES) {
    result[cat] = emphasis[cat] / total;
  }
  return result;
}

export function analyzeGaps(
  current: FitnessBaseline,
  target: CpfiTarget,
): CategoryEmphasis {
  const gaps: ComponentGap[] = [
    { component: "cooperMeters", current: current.cooperMeters, target: target.targetCooperMeters, gapRatio: 0 },
    { component: "pushUps", current: current.pushUps, target: target.componentTargets.pushUps, gapRatio: 0 },
    { component: "sitUps", current: current.sitUps, target: target.componentTargets.sitUps, gapRatio: 0 },
    { component: "pullUps", current: current.pullUps, target: target.componentTargets.pullUps, gapRatio: 0 },
    { component: "standingJumpCm", current: current.standingJumpCm, target: target.componentTargets.standingJumpCm, gapRatio: 0 },
    { component: "backExtensionReps", current: current.backExtensionReps, target: target.componentTargets.backExtensionReps, gapRatio: 0 },
  ];

  // Calculate gap ratios
  for (const gap of gaps) {
    if (gap.target <= 0) {
      gap.gapRatio = 0;
    } else if (gap.current >= gap.target) {
      gap.gapRatio = 0;
    } else {
      gap.gapRatio = (gap.target - gap.current) / gap.target;
    }
  }

  // Start with default emphasis and shift toward weaknesses
  const emphasis = { ...defaultEmphasis };

  for (const gap of gaps) {
    if (gap.gapRatio <= 0.1) continue; // small gap, no adjustment needed

    const shift = gap.gapRatio * 0.12;
    const categories = componentToCategories[gap.component];

    for (const cat of categories) {
      emphasis[cat] += shift / categories.length;
    }
  }

  // Ensure recovery and mental never go below minimum
  emphasis.recovery = Math.max(emphasis.recovery, 0.05);
  emphasis.mental = Math.max(emphasis.mental, 0.03);

  return normalize(emphasis);
}
