import type { UserProfile, ResolvedProfile } from "../types/profile.js";
import type { TrainingPlan, WeekPlan, TrainingDay, TrainingSession, Macrocycle } from "../types/plan.js";
import type { ExerciseCategory } from "../types/exercise.js";
import { ALL_CATEGORIES } from "../types/exercise.js";
import { calculateCpfi } from "../cpfi/calculator.js";
import { getCpfiTarget } from "../cpfi/targets.js";
import { resolveProfile } from "../cpfi/estimates.js";
import { analyzeGaps } from "./gap-analysis.js";
import { allocatePhases } from "./periodization.js";
import { weeklyEmphasis, allocateSessions, computeTrainingDays } from "./volume.js";
import { selectExercises, findWeakestComponents } from "./exercise-selector.js";
import { prescribe, estimateMinutes } from "./prescription.js";
import { weeksBetween, todayISO } from "../util/dates.js";

// Day layout patterns by training days per week
const dayPatterns: Record<number, number[]> = {
  2: [0, 3],               // Mon, Thu
  3: [0, 2, 4],            // Mon, Wed, Fri
  4: [0, 1, 3, 5],         // Mon, Tue, Thu, Sat
  5: [0, 1, 2, 3, 5],      // Mon, Tue, Wed, Thu, Sat
  6: [0, 1, 2, 3, 4, 5],   // Mon-Sat
};

// Category labels for day focus descriptions
const categoryLabels: Record<ExerciseCategory, string> = {
  aerobic_base: "Aerobic",
  interval_speed: "Intervals",
  upper_body_strength: "Upper Body",
  core_strength: "Core",
  lower_body_power: "Lower Body",
  strength_endurance: "Strength Endurance",
  ruck_march: "Ruck March",
  recovery: "Recovery",
  mental: "Mental",
};

// Muscle group classification for recovery constraint
type MuscleGroup = "upper" | "lower" | "full";
const categoryMuscleGroup: Record<ExerciseCategory, MuscleGroup> = {
  upper_body_strength: "upper",
  lower_body_power: "lower",
  ruck_march: "lower",
  strength_endurance: "full",
  core_strength: "full",
  aerobic_base: "full",
  interval_speed: "full",
  recovery: "full",
  mental: "full",
};

function findPhaseForWeek(macrocycles: Macrocycle[], weekNum: number): Macrocycle {
  return macrocycles.find((m) => weekNum >= m.startWeek && weekNum <= m.endWeek) ?? macrocycles[macrocycles.length - 1]!;
}

/**
 * Warm-up suggestion based on session category.
 */
function sessionWarmUp(category: ExerciseCategory): string | undefined {
  switch (category) {
    case "aerobic_base":
    case "interval_speed":
      return "5 min easy walk + dynamic stretching";
    case "upper_body_strength":
    case "lower_body_power":
      return "5 min light cardio + dynamic stretching + warm-up sets at 50%";
    case "strength_endurance":
      return "5 min jog + joint mobility";
    case "ruck_march":
      return "5 min easy walk + ankle/hip mobility";
    default:
      return undefined;
  }
}

/**
 * Cool-down suggestion based on session category.
 */
function sessionCoolDown(category: ExerciseCategory): string | undefined {
  switch (category) {
    case "aerobic_base":
    case "interval_speed":
      return "5 min walk + static stretching";
    case "upper_body_strength":
    case "lower_body_power":
    case "strength_endurance":
      return "5 min static stretching";
    case "ruck_march":
      return "5 min walk + foot care + stretching";
    default:
      return undefined;
  }
}

/**
 * Readiness guidance based on phase and week state.
 */
function getReadinessGuidance(
  phase: string,
  isDeload: boolean,
  isTransition: boolean,
): string {
  if (isDeload) {
    return "Planned recovery week \u2014 trust the process. Maintain movement quality, reduce effort.";
  }
  if (isTransition) {
    return "Transition week between training blocks. Lighter volume to prepare for the next phase.";
  }
  switch (phase) {
    case "anatomical_adaptation":
      return "Focus on learning movement patterns. Keep effort moderate \u2014 soreness is normal but sharp pain is not.";
    case "strength_endurance":
      return "High-demand week. If RPE consistently exceeds targets by 2+, reduce volume 20%. Prioritize sleep.";
    case "taper":
      return "Taper week \u2014 you may feel restless. Maintain intensity on prescribed sessions but don\u2019t add extra work.";
    default:
      return "Train as prescribed. Scale back if sleep-deprived, ill, or experiencing pain beyond normal soreness.";
  }
}

/**
 * Calculate weekly running distance from aerobic/interval sessions.
 */
function calculateRunningKm(sessions: TrainingSession[]): number {
  let totalKm = 0;
  for (const session of sessions) {
    if (session.category !== "aerobic_base" && session.category !== "interval_speed") continue;
    for (const ex of session.exercises) {
      if (ex.distanceKm) {
        totalKm += ex.distanceKm * ex.sets;
      } else if (ex.durationMinutes) {
        // Estimate km from duration: ~8 min/km easy, ~5 min/km intervals
        const paceMinPerKm = session.category === "interval_speed" ? 5 : 8;
        totalKm += (ex.durationMinutes * ex.sets) / paceMinPerKm;
      }
    }
  }
  return Math.round(totalKm * 10) / 10;
}

function buildWeek(
  resolved: ResolvedProfile,
  weekNum: number,
  totalWeeks: number,
  macrocycles: Macrocycle[],
  targetCpfi: ReturnType<typeof getCpfiTarget>,
  weakestComponents: ReturnType<typeof findWeakestComponents>,
  fitnessCategory: ReturnType<typeof calculateCpfi>["category"],
  prevRunningKm: number,
): WeekPlan {
  const macro = findPhaseForWeek(macrocycles, weekNum);
  const phase = macro.phase;
  const weekInPhase = weekNum - macro.startWeek;
  const phaseLength = macro.endWeek - macro.startWeek + 1;
  const phaseProgress = phaseLength > 1 ? weekInPhase / (phaseLength - 1) : 0;
  const isTransition = macro.isTransition ?? false;

  // Deload every 4th week within phases > 3 weeks, skip in anatomical_adaptation and taper
  const isDeload =
    !isTransition &&
    phase !== "anatomical_adaptation" &&
    phase !== "taper" &&
    phaseLength > 3 &&
    weekInPhase > 0 &&
    (weekInPhase + 1) % 4 === 0;

  // Dynamic training days for this week
  const trainingDayCount = computeTrainingDays(
    fitnessCategory,
    phase,
    weekNum - 1, // 0-indexed for ramp-up calc
    totalWeeks,
    resolved.maxTrainingDays,
    isDeload,
    isTransition,
    weekInPhase,
  );

  // Recompute gap emphasis with phase context (peaking gets more test-specific)
  const phaseEmphasis = analyzeGaps(resolved.currentFitness, targetCpfi, phase);
  const emphasis = weeklyEmphasis(phaseEmphasis, phase);

  // Session allocation based on this week's actual training days
  const sessionCounts = allocateSessions(emphasis, trainingDayCount, weekNum);

  // Build one session per category slot
  const sessionPool: TrainingSession[] = [];

  for (const cat of ALL_CATEGORIES) {
    const count = sessionCounts[cat];
    if (count <= 0) continue;

    const exercises = selectExercises({
      category: cat,
      phase,
      equipment: resolved.availableEquipment,
      weekInPlan: weekNum,
      totalWeeks,
      weakestComponents,
    });

    if (exercises.length === 0) continue;

    for (let i = 0; i < count; i++) {
      // Cardio/recovery/mental: 1 exercise per session
      // Strength/circuit categories: 2 exercises per session
      const singleExerciseCategories: ExerciseCategory[] = [
        "aerobic_base", "interval_speed", "ruck_march", "recovery", "mental",
      ];
      const perSession = singleExerciseCategories.includes(cat) ? 1 : Math.min(2, exercises.length);
      const offset = (i * perSession) % exercises.length;
      const picked: typeof exercises = [];
      for (let j = 0; j < perSession; j++) {
        picked.push(exercises[(offset + j) % exercises.length]!);
      }

      const prescriptions = picked.map((ex) =>
        prescribe(ex, phase, phaseProgress, isDeload, weekNum),
      );

      const totalMinutes = prescriptions.reduce(
        (sum, p) => sum + estimateMinutes(p),
        0,
      );

      const warmUp = sessionWarmUp(cat);
      const coolDown = sessionCoolDown(cat);
      // Add warm-up/cool-down time (~10 min total)
      const overheadMinutes = (warmUp ? 5 : 0) + (coolDown ? 5 : 0);

      sessionPool.push({
        category: cat,
        focus: categoryLabels[cat],
        exercises: prescriptions,
        estimatedMinutes: Math.round(totalMinutes + overheadMinutes),
        warmUp,
        coolDown,
      });
    }
  }

  // Sort sessions within pool: plyometric sessions first (for day ordering)
  // This ensures when assigned to the same day, plyo comes before strength
  const isPlyoSession = (s: TrainingSession) =>
    s.category === "lower_body_power" && s.exercises.some((e) => e.groundContacts);

  // Assign sessions to days, spreading same-category sessions apart
  // and respecting muscle group recovery constraints
  const trainingDays = dayPatterns[trainingDayCount] ?? dayPatterns[3]!;
  const days: TrainingDay[] = [];
  const sessionsPerDay: TrainingSession[][] = trainingDays.map(() => []);

  const byCategory = new Map<ExerciseCategory, TrainingSession[]>();
  for (const s of sessionPool) {
    if (!byCategory.has(s.category)) byCategory.set(s.category, []);
    byCategory.get(s.category)!.push(s);
  }

  const priorityOrder: ExerciseCategory[] = [
    "aerobic_base",
    "interval_speed",
    "upper_body_strength",
    "lower_body_power",
    "strength_endurance",
    "core_strength",
    "ruck_march",
    "recovery",
    "mental",
  ];

  for (const cat of priorityOrder) {
    const sessions = byCategory.get(cat);
    if (!sessions) continue;

    for (const session of sessions) {
      const muscleGroup = categoryMuscleGroup[cat];
      let bestDay = 0;
      let bestScore = Infinity;

      for (let d = 0; d < trainingDays.length; d++) {
        const hasCategory = sessionsPerDay[d]!.some((s) => s.category === cat);
        let score = sessionsPerDay[d]!.length + (hasCategory ? 100 : 0);

        // Muscle group adjacency penalty: avoid same muscle group on consecutive days
        if (muscleGroup !== "full") {
          // Check previous day
          if (d > 0) {
            const prevHasSameGroup = sessionsPerDay[d - 1]!.some(
              (s) => categoryMuscleGroup[s.category] === muscleGroup,
            );
            if (prevHasSameGroup) score += 50;
          }
          // Check next day
          if (d < trainingDays.length - 1) {
            const nextHasSameGroup = sessionsPerDay[d + 1]!.some(
              (s) => categoryMuscleGroup[s.category] === muscleGroup,
            );
            if (nextHasSameGroup) score += 50;
          }
        }

        // Ruck not adjacent to lower body power
        if (cat === "ruck_march") {
          if (d > 0 && sessionsPerDay[d - 1]!.some((s) => s.category === "lower_body_power")) score += 50;
          if (d < trainingDays.length - 1 && sessionsPerDay[d + 1]!.some((s) => s.category === "lower_body_power")) score += 50;
        }
        if (cat === "lower_body_power") {
          if (d > 0 && sessionsPerDay[d - 1]!.some((s) => s.category === "ruck_march")) score += 50;
          if (d < trainingDays.length - 1 && sessionsPerDay[d + 1]!.some((s) => s.category === "ruck_march")) score += 50;
        }

        if (score < bestScore) {
          bestScore = score;
          bestDay = d;
        }
      }
      sessionsPerDay[bestDay]!.push(session);
    }
  }

  // Sort sessions within each day: plyometric before strength, recovery/mental last
  for (const daySessions of sessionsPerDay) {
    daySessions.sort((a, b) => {
      const aIsPlyo = isPlyoSession(a) ? 0 : 1;
      const bIsPlyo = isPlyoSession(b) ? 0 : 1;
      if (aIsPlyo !== bIsPlyo) return aIsPlyo - bIsPlyo;
      // Recovery/mental last
      const aIsRecovery = (a.category === "recovery" || a.category === "mental") ? 1 : 0;
      const bIsRecovery = (b.category === "recovery" || b.category === "mental") ? 1 : 0;
      return aIsRecovery - bIsRecovery;
    });
  }

  // Light activity suggestions for recovery days — rotate through these
  const recoverySuggestions = [
    "20-30 min easy walk",
    "Light stretching or yoga",
    "15-20 min walk + foam rolling",
    "Easy swim or cycling (low effort)",
    "20 min walk in nature",
  ];

  // Build all 7 days of the week
  for (let dow = 0; dow < 7; dow++) {
    const trainingDayIdx = trainingDays.indexOf(dow);

    if (trainingDayIdx >= 0 && sessionsPerDay[trainingDayIdx]!.length > 0) {
      const sessions = sessionsPerDay[trainingDayIdx]!;
      const focuses = [...new Set(sessions.map((s) => s.focus))];
      days.push({
        dayOfWeek: dow,
        type: "training",
        focus: focuses.join(" + "),
        sessions,
      });
    } else if (dow === 6) {
      // Sunday: always full rest, no suggestion
      days.push({ dayOfWeek: dow, type: "rest", sessions: [] });
    } else if (!trainingDays.includes(dow)) {
      // Recovery day — add a light suggestion to roughly half of them
      const suggestionIdx = (weekNum + dow) % recoverySuggestions.length;
      const addSuggestion = (weekNum + dow) % 3 !== 0;
      days.push({
        dayOfWeek: dow,
        type: "active_recovery",
        sessions: [],
        suggestion: addSuggestion ? recoverySuggestions[suggestionIdx] : undefined,
      });
    } else {
      days.push({ dayOfWeek: dow, type: "rest", sessions: [] });
    }
  }

  // Calculate running volume and enforce 10% weekly increase cap
  const allSessions = days.flatMap((d) => d.sessions);
  let weeklyRunningKm = calculateRunningKm(allSessions);

  // Enforce 10% weekly increase cap (skip week 1 and deload weeks)
  if (prevRunningKm > 0 && weekNum > 1 && !isDeload) {
    const maxAllowed = Math.round(prevRunningKm * 1.1 * 10) / 10;
    if (weeklyRunningKm > maxAllowed) {
      // Scale down aerobic/interval distances proportionally
      const scaleFactor = maxAllowed / weeklyRunningKm;
      for (const day of days) {
        for (const session of day.sessions) {
          if (session.category !== "aerobic_base" && session.category !== "interval_speed") continue;
          for (const ex of session.exercises) {
            if (ex.distanceKm) {
              ex.distanceKm = Math.max(1, Math.round(ex.distanceKm * scaleFactor * 10) / 10);
            } else if (ex.durationMinutes) {
              ex.durationMinutes = Math.max(5, Math.round(ex.durationMinutes * scaleFactor));
            }
          }
        }
      }
      weeklyRunningKm = maxAllowed;
    }
  }

  return {
    weekNumber: weekNum,
    phase,
    isDeload,
    trainingDays: trainingDayCount,
    days,
    weeklyRunningKm,
    readinessGuidance: getReadinessGuidance(phase, isDeload, isTransition),
  };
}

export function generatePlan(profile: UserProfile): TrainingPlan {
  const resolved = resolveProfile(profile);
  const startDate = todayISO();
  const totalWeeks = weeksBetween(startDate, resolved.serviceDate);

  if (totalWeeks <= 0) {
    throw new Error("Service date must be in the future");
  }

  // CPFI Assessment
  const currentCpfi = calculateCpfi(resolved.currentFitness);
  const targetCpfi = getCpfiTarget(resolved.targetServiceLevel);

  // Periodization
  const macrocycles = allocatePhases(totalWeeks);

  // Weakest components for exercise selection
  const weakestComponents = findWeakestComponents(
    resolved.currentFitness,
    targetCpfi.componentTargets,
    targetCpfi.targetCooperMeters,
  );

  // Generate each week with dynamic volume
  const weeks: WeekPlan[] = [];
  let prevRunningKm = 0;

  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    const week = buildWeek(
      resolved,
      weekNum,
      totalWeeks,
      macrocycles,
      targetCpfi,
      weakestComponents,
      currentCpfi.category,
      prevRunningKm,
    );
    prevRunningKm = week.weeklyRunningKm ?? 0;
    weeks.push(week);
  }

  return {
    profile,
    resolved,
    currentCpfi,
    targetCpfi,
    startDate,
    endDate: resolved.serviceDate,
    totalWeeks,
    macrocycles,
    weeks,
  };
}
