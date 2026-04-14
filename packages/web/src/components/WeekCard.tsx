import type { WeekPlan, TrainingDay, ExercisePrescription } from "@intplan/core";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const phaseLabels: Record<string, string> = {
  anatomical_adaptation: "Anatomical Adaptation",
  aerobic_base: "Aerobic Base",
  strength_build: "Strength Build",
  strength_endurance: "Strength Endurance",
  peaking: "Peaking",
  taper: "Taper",
};

const phaseColors: Record<string, string> = {
  anatomical_adaptation: "#6b7280",
  aerobic_base: "#3b82f6",
  strength_build: "#ef4444",
  strength_endurance: "#f59e0b",
  peaking: "#8b5cf6",
  taper: "#10b981",
};

function formatExercise(ex: ExercisePrescription): string {
  if (ex.reps) return `${ex.sets}x${ex.reps} @${ex.intensityPercent}%`;
  if (ex.durationMinutes) return `${ex.durationMinutes}min @${ex.intensityPercent}%`;
  if (ex.distanceKm) return `${ex.distanceKm}km @${ex.intensityPercent}%`;
  return `${ex.sets} sets`;
}

function DayRow({ day }: { day: TrainingDay }) {
  const name = dayNames[day.dayOfWeek] ?? "???";

  if (day.type === "active_recovery") {
    return (
      <div className="day-row recovery">
        <span className="day-row-name">{name}</span>
        <span className="day-row-focus">Recovery</span>
        <span className="day-row-suggestion">{day.suggestion ?? "Light activity"}</span>
      </div>
    );
  }

  const exercises = day.sessions.flatMap((s) => s.exercises);

  return (
    <div className="day-row training">
      <span className="day-row-name">{name}</span>
      <span className="day-row-focus">{day.focus}</span>
      <div className="day-row-exercises">
        {exercises.map((ex, i) => (
          <span key={ex.exerciseId + i}>
            {i > 0 && <span className="exercise-separator">&middot;</span>}
            <span className="exercise-inline">
              {ex.exerciseName}{" "}
              <span className="exercise-inline-detail">{formatExercise(ex)}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  week: WeekPlan;
  expanded: boolean;
  onToggle: () => void;
}

export function WeekCard({ week, expanded, onToggle }: Props) {
  const label = phaseLabels[week.phase] ?? week.phase;
  const color = phaseColors[week.phase] ?? "#6b7280";

  const activeDays = week.days.filter((d) => d.type !== "rest");
  const restDayNames = week.days
    .filter((d) => d.type === "rest")
    .map((d) => dayNames[d.dayOfWeek])
    .join(", ");

  return (
    <div className="week-card" id={`week-${week.weekNumber}`}>
      <div
        className="week-header"
        style={{ borderLeftColor: color }}
        onClick={onToggle}
      >
        <span className={`week-chevron${expanded ? " expanded" : ""}`}>&#9654;</span>
        <span className="week-number">Week {week.weekNumber}</span>
        <span className="week-phase" style={{ color }}>{label}</span>
        <span className="week-meta">
          {week.trainingDays}d
          {restDayNames && (
            <span className="rest-days-label">Rest: {restDayNames}</span>
          )}
          {week.isDeload && <span className="deload-badge">DELOAD</span>}
        </span>
      </div>
      {expanded && (
        <div className="week-days-list">
          {activeDays.map((day) => (
            <DayRow key={day.dayOfWeek} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}
