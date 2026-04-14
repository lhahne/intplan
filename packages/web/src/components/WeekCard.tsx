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

function DayBox({ day }: { day: TrainingDay }) {
  const name = dayNames[day.dayOfWeek] ?? "???";

  if (day.type === "rest") {
    return (
      <div className="day-box rest">
        <span className="day-name">{name}</span>
        <span className="day-type-label">Rest</span>
      </div>
    );
  }

  if (day.type === "active_recovery") {
    return (
      <div className="day-box recovery">
        <span className="day-name">{name}</span>
        <span className="day-type-label">Recovery</span>
      </div>
    );
  }

  return (
    <div className="day-box training">
      <span className="day-name">{name}</span>
      <span className="day-focus">{day.focus}</span>
      <div className="exercises">
        {day.sessions.flatMap((s) =>
          s.exercises.map((ex) => (
            <div key={ex.exerciseId + s.category} className="exercise">
              <span className="exercise-name">{ex.exerciseName}</span>
              <span className="exercise-detail">{formatExercise(ex)}</span>
            </div>
          )),
        )}
      </div>
    </div>
  );
}

interface Props {
  week: WeekPlan;
}

export function WeekCard({ week }: Props) {
  const label = phaseLabels[week.phase] ?? week.phase;
  const color = phaseColors[week.phase] ?? "#6b7280";

  return (
    <div className="week-card">
      <div className="week-header" style={{ borderLeftColor: color }}>
        <span className="week-number">Week {week.weekNumber}</span>
        <span className="week-phase" style={{ color }}>{label}</span>
        <span className="week-meta">
          {week.trainingDays}d
          {week.isDeload && <span className="deload-badge">DELOAD</span>}
        </span>
      </div>
      <div className="week-days-grid">
        {week.days.map((day) => (
          <DayBox key={day.dayOfWeek} day={day} />
        ))}
      </div>
    </div>
  );
}
