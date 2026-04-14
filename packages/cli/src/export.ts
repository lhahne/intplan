import type { TrainingPlan, WeekPlan, TrainingDay } from "@intplan/core";
import { writeFileSync } from "node:fs";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const phaseLabels: Record<string, string> = {
  anatomical_adaptation: "Anatomical Adaptation",
  aerobic_base: "Aerobic Base",
  strength_build: "Strength Build",
  strength_endurance: "Strength Endurance",
  peaking: "Peaking",
  taper: "Taper",
};

function formatExerciseMd(ex: { exerciseName: string; sets: number; reps?: number; durationMinutes?: number; distanceKm?: number; intensityPercent: number }): string {
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

function formatDayMd(day: TrainingDay): string {
  const dayName = dayNames[day.dayOfWeek] ?? "???";

  if (day.type === "rest") return `| ${dayName} | REST | |`;
  if (day.type === "active_recovery") {
    const suggestion = day.suggestion ? day.suggestion : "";
    return `| ${dayName} | Active Recovery | ${suggestion} |`;
  }

  const exercises = day.sessions.flatMap((s) =>
    s.exercises.map(formatExerciseMd),
  );

  return `| ${dayName} | ${day.focus ?? "Training"} | ${exercises.join(", ")} |`;
}

function weekToMd(week: WeekPlan): string {
  const label = phaseLabels[week.phase] ?? week.phase;
  const deload = week.isDeload ? " (DELOAD)" : "";
  const lines: string[] = [
    `### Week ${week.weekNumber} - ${label}${deload} (${week.trainingDays} days)`,
    "",
    "| Day | Focus | Exercises |",
    "|-----|-------|-----------|",
  ];

  for (const day of week.days) {
    lines.push(formatDayMd(day));
  }

  lines.push("");
  return lines.join("\n");
}

export function exportToMarkdown(plan: TrainingPlan): string {
  const lines: string[] = [
    `# Training Plan - ${plan.profile.targetServiceLevel.replace("_", " ")}`,
    "",
    `**Service date:** ${plan.endDate}`,
    `**Total weeks:** ${plan.totalWeeks}`,
    `**Current CPFI:** ${plan.currentCpfi.cpfi} (${plan.currentCpfi.category})`,
    `**Target CPFI:** ${plan.targetCpfi.targetCpfi}`,
    "",
    "## Phase Timeline",
    "",
  ];

  for (const macro of plan.macrocycles) {
    const label = phaseLabels[macro.phase] ?? macro.phase;
    const weeks = macro.endWeek - macro.startWeek + 1;
    lines.push(`- **Weeks ${macro.startWeek}-${macro.endWeek}:** ${label} (${weeks} weeks) - ${macro.description}`);
  }

  lines.push("", "## Weekly Plans", "");

  for (const week of plan.weeks) {
    lines.push(weekToMd(week));
  }

  return lines.join("\n");
}

export function exportToJson(plan: TrainingPlan): string {
  return JSON.stringify(plan, null, 2);
}

export function writeExport(plan: TrainingPlan, format: "json" | "md", outputPath?: string): void {
  const content = format === "json" ? exportToJson(plan) : exportToMarkdown(plan);

  if (outputPath) {
    writeFileSync(outputPath, content, "utf-8");
    console.log(`Plan exported to ${outputPath}`);
  } else {
    console.log(content);
  }
}
