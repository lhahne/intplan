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

function findPhaseForWeek(macrocycles: Macrocycle[], weekNum: number): Macrocycle {
  return macrocycles.find((m) => weekNum >= m.startWeek && weekNum <= m.endWeek) ?? macrocycles[macrocycles.length - 1]!;
}

function buildWeek(
  resolved: ResolvedProfile,
  weekNum: number,
  totalWeeks: number,
  macrocycles: Macrocycle[],
  baseEmphasis: ReturnType<typeof analyzeGaps>,
  weakestComponents: ReturnType<typeof findWeakestComponents>,
  fitnessCategory: ReturnType<typeof calculateCpfi>["category"],
): WeekPlan {
  const macro = findPhaseForWeek(macrocycles, weekNum);
  const phase = macro.phase;
  const weekInPhase = weekNum - macro.startWeek;
  const phaseLength = macro.endWeek - macro.startWeek + 1;
  const phaseProgress = phaseLength > 1 ? weekInPhase / (phaseLength - 1) : 0;

  // Deload every 4th week within phases > 3 weeks, skip in anatomical_adaptation
  const isDeload =
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
  );

  // Weekly emphasis
  const emphasis = weeklyEmphasis(baseEmphasis, phase);

  // Session allocation based on this week's actual training days
  const sessionCounts = allocateSessions(emphasis, trainingDayCount);

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
        prescribe(ex, phase, phaseProgress, isDeload),
      );

      const totalMinutes = prescriptions.reduce(
        (sum, p) => sum + estimateMinutes(p),
        0,
      );

      sessionPool.push({
        category: cat,
        focus: categoryLabels[cat],
        exercises: prescriptions,
        estimatedMinutes: Math.round(totalMinutes),
      });
    }
  }

  // Assign sessions to days, spreading same-category sessions apart
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
      let bestDay = 0;
      let bestScore = Infinity;
      for (let d = 0; d < trainingDays.length; d++) {
        const hasCategory = sessionsPerDay[d]!.some((s) => s.category === cat);
        const score = sessionsPerDay[d]!.length + (hasCategory ? 100 : 0);
        if (score < bestScore) {
          bestScore = score;
          bestDay = d;
        }
      }
      sessionsPerDay[bestDay]!.push(session);
    }
  }

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
      days.push({ dayOfWeek: dow, type: "rest", sessions: [] });
    } else if (!trainingDays.includes(dow)) {
      days.push({ dayOfWeek: dow, type: "active_recovery", sessions: [] });
    } else {
      days.push({ dayOfWeek: dow, type: "rest", sessions: [] });
    }
  }

  return {
    weekNumber: weekNum,
    phase,
    isDeload,
    trainingDays: trainingDayCount,
    days,
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

  // Gap Analysis
  const baseEmphasis = analyzeGaps(resolved.currentFitness, targetCpfi);

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

  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    weeks.push(
      buildWeek(
        resolved,
        weekNum,
        totalWeeks,
        macrocycles,
        baseEmphasis,
        weakestComponents,
        currentCpfi.category,
      ),
    );
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
