import type { TrainingPlan, WeekPlan, TrainingDay } from "@intplan/core";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const phaseLabels: Record<string, string> = {
  anatomical_adaptation: "Anatomical Adaptation",
  aerobic_base: "Aerobic Base",
  strength_build: "Strength Build",
  strength_endurance: "Strength Endurance",
  peaking: "Peaking",
  taper: "Taper",
};

const categoryColors: Record<string, string> = {
  excellent: "\x1b[32m",   // green
  good: "\x1b[36m",        // cyan
  satisfactory: "\x1b[33m", // yellow
  fair: "\x1b[33m",         // yellow
  poor: "\x1b[31m",         // red
};

const reset = "\x1b[0m";
const bold = "\x1b[1m";
const dim = "\x1b[2m";

export function displaySummary(plan: TrainingPlan): void {
  const { currentCpfi, targetCpfi } = plan;
  const color = categoryColors[currentCpfi.category] ?? "";

  console.log(`\n${bold}═══ TRAINING PLAN SUMMARY ═══${reset}\n`);

  const r = plan.resolved;
  const minDays = Math.min(...plan.weeks.map((w) => w.trainingDays));
  const maxDays = Math.max(...plan.weeks.map((w) => w.trainingDays));
  const daysRange = minDays === maxDays ? `${minDays}` : `${minDays}-${maxDays}`;

  const inputLabel = plan.profile.fitnessInput.type === "estimated"
    ? ` (estimated: ${plan.profile.fitnessInput.level})`
    : "";

  console.log(`  Service date:    ${plan.endDate}`);
  console.log(`  Total weeks:     ${plan.totalWeeks}`);
  console.log(`  Service level:   ${plan.profile.targetServiceLevel}`);
  console.log(`  Training days:   ${daysRange}/week (max ${plan.profile.maxTrainingDays})\n`);

  console.log(`  ${bold}Current CPFI:${reset}  ${color}${currentCpfi.cpfi} (${currentCpfi.category})${reset}${inputLabel}`);
  console.log(`  ${bold}Target CPFI:${reset}   ${targetCpfi.targetCpfi}\n`);

  console.log(`  ${bold}Component Breakdown:${reset}`);
  console.log(`    Cooper test:     ${currentCpfi.cooperMeters}m → ${targetCpfi.targetCooperMeters}m  (class ${currentCpfi.cooperClass})`);

  const cs = currentCpfi.componentScores;
  const ct = targetCpfi.componentTargets;
  console.log(`    Push-ups:        ${r.currentFitness.pushUps} → ${ct.pushUps}  (score ${cs.pushUps}/3)`);
  console.log(`    Sit-ups:         ${r.currentFitness.sitUps} → ${ct.sitUps}  (score ${cs.sitUps}/3)`);
  console.log(`    Pull-ups:        ${r.currentFitness.pullUps} → ${ct.pullUps}  (score ${cs.pullUps}/3)`);
  console.log(`    Standing jump:   ${r.currentFitness.standingJumpCm}cm → ${ct.standingJumpCm}cm  (score ${cs.standingJump}/3)`);
  console.log(`    Back extension:  ${r.currentFitness.backExtensionReps} → ${ct.backExtensionReps}  (score ${cs.backExtension}/3)`);

  console.log(`\n  ${bold}Phase Timeline:${reset}`);
  for (const macro of plan.macrocycles) {
    const label = phaseLabels[macro.phase] ?? macro.phase;
    const weeks = macro.endWeek - macro.startWeek + 1;
    const bar = "█".repeat(Math.min(weeks, 30));
    console.log(`    W${String(macro.startWeek).padStart(2)}-${String(macro.endWeek).padStart(2)}  ${bar} ${label} (${weeks}w)`);
  }
  console.log();
}

function formatExercise(ex: { exerciseName: string; sets: number; reps?: number; durationMinutes?: number; distanceKm?: number; intensityPercent: number }): string {
  let detail: string;
  if (ex.reps) {
    detail = `${ex.sets}x${ex.reps}`;
  } else if (ex.durationMinutes) {
    detail = `${ex.durationMinutes}min`;
  } else if (ex.distanceKm) {
    detail = `${ex.distanceKm}km`;
  } else {
    detail = `${ex.sets} sets`;
  }
  return `${ex.exerciseName} ${detail} @${ex.intensityPercent}%`;
}

function formatDay(day: TrainingDay): string {
  const dayName = dayNames[day.dayOfWeek] ?? "???";

  if (day.type === "rest") {
    return `  ${dim}${dayName}  REST${reset}`;
  }
  if (day.type === "active_recovery") {
    return `  ${dim}${dayName}  Active Recovery${reset}`;
  }

  const exercises = day.sessions.flatMap((s) =>
    s.exercises.map(formatExercise),
  );

  if (exercises.length === 0) {
    return `  ${dayName}  ${day.focus ?? "Training"}`;
  }

  const lines = [`  ${bold}${dayName}${reset}  ${day.focus ?? ""}`];
  for (const ex of exercises) {
    lines.push(`       ${ex}`);
  }
  return lines.join("\n");
}

export function displayWeek(week: WeekPlan): void {
  const label = phaseLabels[week.phase] ?? week.phase;
  const deload = week.isDeload ? " (DELOAD)" : "";
  console.log(`${bold}Week ${week.weekNumber}${reset}  │  ${label}${deload}  │  ${week.trainingDays} training days`);
  console.log("─".repeat(65));

  for (const day of week.days) {
    console.log(formatDay(day));
  }
  console.log();
}

export function displayPlan(plan: TrainingPlan, weekRange?: { start: number; end: number }): void {
  displaySummary(plan);

  const start = weekRange?.start ?? 1;
  const end = weekRange?.end ?? Math.min(plan.totalWeeks, 4); // Default: show first 4 weeks

  console.log(`${bold}═══ WEEKLY PLAN (Weeks ${start}-${end} of ${plan.totalWeeks}) ═══${reset}\n`);

  for (const week of plan.weeks) {
    if (week.weekNumber >= start && week.weekNumber <= end) {
      displayWeek(week);
    }
  }

  if (end < plan.totalWeeks) {
    console.log(`${dim}... ${plan.totalWeeks - end} more weeks. Use --weeks to see more.${reset}\n`);
  }
}
