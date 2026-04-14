import type { FitnessBaseline, TrainingBackground } from "../types/profile.js";
import type { ServiceLevel } from "../types/cpfi.js";
import type { Equipment } from "../types/equipment.js";
import { getCpfiTarget } from "../cpfi/targets.js";
import { weeksBetween, todayISO, addWeeks } from "../util/dates.js";

export interface FeasibilityResult {
  feasible: boolean;
  availableWeeks: number;
  recommendedWeeks: number;
  recommendedDate: string;
  bottleneck: string;
}

/**
 * Estimate minimum weeks needed to close the Cooper test gap using
 * piecewise improvement rates that reflect diminishing returns.
 */
function cooperWeeks(currentMeters: number, targetMeters: number): number {
  if (currentMeters >= targetMeters) return 0;

  let weeks = 0;
  let current = currentMeters;

  while (current < targetMeters) {
    // Rate decreases as fitness improves
    let ratePerWeek: number;
    if (current < 2200) {
      ratePerWeek = 75;
    } else if (current < 2600) {
      ratePerWeek = 40;
    } else if (current < 2800) {
      ratePerWeek = 30;
    } else {
      ratePerWeek = 25;
    }

    const gapInBracket = Math.min(
      targetMeters - current,
      current < 2200 ? 2200 - current :
      current < 2600 ? 2600 - current :
      current < 2800 ? 2800 - current :
      targetMeters - current,
    );

    const weeksInBracket = Math.ceil(gapInBracket / ratePerWeek);
    weeks += weeksInBracket;
    current += weeksInBracket * ratePerWeek;
  }

  return weeks;
}

/**
 * Estimate weeks to improve pull-ups, accounting for the 0→1 threshold.
 */
function pullUpWeeks(current: number, target: number): number {
  if (current >= target) return 0;

  let weeks = 0;
  let cur = current;

  // 0→1 is a binary threshold requiring ~6 weeks of dedicated work
  if (cur < 1 && target >= 1) {
    weeks += 6;
    cur = 1;
  }

  if (cur >= target) return weeks;

  // 1-8: ~0.4 reps/week
  const lowCap = Math.min(target, 8);
  if (cur < lowCap) {
    weeks += Math.ceil((lowCap - cur) / 0.4);
    cur = lowCap;
  }

  // 8+: ~0.25 reps/week
  if (cur < target) {
    weeks += Math.ceil((target - cur) / 0.25);
  }

  return weeks;
}

/**
 * Estimate weeks for push-ups or sit-ups using piecewise rates:
 * fast beginner gains, moderate mid-range, slow at high reps.
 */
function repEnduranceWeeks(current: number, target: number): number {
  if (current >= target) return 0;

  let weeks = 0;
  let cur = current;

  // First ~15 reps of gap: 2.5/week (beginner effect)
  const fastGap = Math.min(target - cur, Math.max(0, Math.min(15, current + 15) - cur));
  if (fastGap > 0 && cur < 25) {
    const bracket = Math.min(target, 25) - cur;
    if (bracket > 0) {
      weeks += Math.ceil(bracket / 2.5);
      cur += bracket;
    }
  }

  if (cur >= target) return weeks;

  // Mid-range (up to 40): 1.5/week
  if (cur < 40 && cur < target) {
    const bracket = Math.min(target, 40) - cur;
    weeks += Math.ceil(bracket / 1.5);
    cur += bracket;
  }

  if (cur >= target) return weeks;

  // Above 40: 0.8/week
  if (cur < target) {
    weeks += Math.ceil((target - cur) / 0.8);
  }

  return weeks;
}

/**
 * Estimate minimum weeks for the hardest muscle-fitness component gap.
 * Uses non-linear, component-specific improvement models.
 */
function muscleWeeks(
  current: FitnessBaseline,
  targets: {
    pushUps: number;
    sitUps: number;
    pullUps: number;
    standingJumpCm: number;
    backExtensionReps: number;
  },
  hasPlyo: boolean,
): { weeks: number; component: string } {
  const components: { name: string; weeks: number }[] = [
    { name: "push-ups", weeks: repEnduranceWeeks(current.pushUps, targets.pushUps) },
    { name: "sit-ups", weeks: repEnduranceWeeks(current.sitUps, targets.sitUps) },
    { name: "pull-ups", weeks: pullUpWeeks(current.pullUps, targets.pullUps) },
    {
      name: "standing jump",
      weeks: current.standingJumpCm >= targets.standingJumpCm
        ? 0
        : Math.ceil((targets.standingJumpCm - current.standingJumpCm) / (hasPlyo ? 1.5 : 0.7)),
    },
    {
      name: "back extensions",
      weeks: current.backExtensionReps >= targets.backExtensionReps
        ? 0
        : Math.ceil((targets.backExtensionReps - current.backExtensionReps) / 1.5),
    },
  ];

  let maxWeeks = 0;
  let bottleneck = "";

  for (const c of components) {
    if (c.weeks > maxWeeks) {
      maxWeeks = c.weeks;
      bottleneck = c.name;
    }
  }

  return { weeks: maxWeeks, component: bottleneck };
}

// 4 weeks for periodization overhead + 2 weeks for setback buffer
const PERIODIZATION_BUFFER = 6;
const MIN_PLAN_WEEKS = 8;

/**
 * Training background multiplier for improvement rates.
 */
function backgroundMultiplier(bg: TrainingBackground): number {
  switch (bg) {
    case "currently_active": return 1.15;
    case "never_trained": return 0.85;
    default: return 1.0;
  }
}

export function checkFeasibility(
  currentFitness: FitnessBaseline,
  targetLevel: ServiceLevel,
  serviceDate: string,
  trainingBackground: TrainingBackground = "deconditioned",
  equipment: Equipment[] = [],
): FeasibilityResult {
  const target = getCpfiTarget(targetLevel);
  const today = todayISO();
  const availableWeeks = weeksBetween(today, serviceDate);

  const bgMult = backgroundMultiplier(trainingBackground);

  // Apply background multiplier by adjusting baselines toward target
  // (faster learner = effectively closer to target)
  const adjustedFitness: FitnessBaseline = bgMult === 1.0
    ? currentFitness
    : {
        cooperMeters: currentFitness.cooperMeters,
        pushUps: currentFitness.pushUps,
        sitUps: currentFitness.sitUps,
        pullUps: currentFitness.pullUps,
        standingJumpCm: currentFitness.standingJumpCm,
        backExtensionReps: currentFitness.backExtensionReps,
      };

  // For Cooper, apply background multiplier to the rate model
  const cWeeksRaw = cooperWeeks(adjustedFitness.cooperMeters, target.targetCooperMeters);
  const cWeeks = Math.ceil(cWeeksRaw / bgMult);

  // Check if plyometric training is feasible (has some jump-relevant equipment)
  const hasPlyo = equipment.length > 0; // any equipment beyond bodyweight helps

  const muscleRaw = muscleWeeks(adjustedFitness, target.componentTargets, hasPlyo);
  const mWeeks = Math.ceil(muscleRaw.weeks / bgMult);

  const rawWeeks = Math.max(cWeeks, mWeeks);
  const recommendedWeeks = Math.max(rawWeeks + PERIODIZATION_BUFFER, MIN_PLAN_WEEKS);

  const bottleneck = cWeeks >= mWeeks ? "Cooper test" : muscleRaw.component;

  const feasible = availableWeeks >= recommendedWeeks;
  const recommendedDate = addWeeks(today, recommendedWeeks);

  return {
    feasible,
    availableWeeks,
    recommendedWeeks,
    recommendedDate,
    bottleneck,
  };
}
