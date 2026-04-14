import type { TrainingPlan } from "@intplan/core";
import { PhaseTimeline } from "./PhaseTimeline.tsx";
import { WeekCard } from "./WeekCard.tsx";

const categoryColors: Record<string, string> = {
  excellent: "#22c55e",
  good: "#06b6d4",
  satisfactory: "#eab308",
  fair: "#f97316",
  poor: "#ef4444",
};

interface Props {
  plan: TrainingPlan | null;
  error: string | null;
}

export function PlanView({ plan, error }: Props) {
  if (error) {
    return (
      <div className="plan-panel">
        <div className="plan-error">{error}</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="plan-panel">
        <div className="plan-empty">Configure parameters to generate a plan</div>
      </div>
    );
  }

  const { currentCpfi, targetCpfi, resolved } = plan;
  const cpfiColor = categoryColors[currentCpfi.category] ?? "#6b7280";

  const minDays = Math.min(...plan.weeks.map((w) => w.trainingDays));
  const maxDays = Math.max(...plan.weeks.map((w) => w.trainingDays));
  const daysRange = minDays === maxDays ? `${minDays}` : `${minDays}-${maxDays}`;

  return (
    <div className="plan-panel">
      <div className="plan-summary">
        <div className="summary-row">
          <div className="summary-card">
            <span className="summary-label">Current CPFI</span>
            <span className="summary-value" style={{ color: cpfiColor }}>
              {currentCpfi.cpfi}
            </span>
            <span className="summary-sub">{currentCpfi.category}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Target CPFI</span>
            <span className="summary-value">{targetCpfi.targetCpfi}</span>
            <span className="summary-sub">{plan.profile.targetServiceLevel.replace("_", " ")}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Duration</span>
            <span className="summary-value">{plan.totalWeeks}</span>
            <span className="summary-sub">weeks</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Training</span>
            <span className="summary-value">{daysRange}</span>
            <span className="summary-sub">days/week</span>
          </div>
        </div>

        <div className="component-grid">
          <ComponentRow
            label="Cooper test"
            current={`${resolved.currentFitness.cooperMeters}m`}
            target={`${targetCpfi.targetCooperMeters}m`}
            score={currentCpfi.componentScores.pushUps}
          />
          <ComponentRow
            label="Push-ups"
            current={String(resolved.currentFitness.pushUps)}
            target={String(targetCpfi.componentTargets.pushUps)}
            score={currentCpfi.componentScores.pushUps}
          />
          <ComponentRow
            label="Sit-ups"
            current={String(resolved.currentFitness.sitUps)}
            target={String(targetCpfi.componentTargets.sitUps)}
            score={currentCpfi.componentScores.sitUps}
          />
          <ComponentRow
            label="Pull-ups"
            current={String(resolved.currentFitness.pullUps)}
            target={String(targetCpfi.componentTargets.pullUps)}
            score={currentCpfi.componentScores.pullUps}
          />
          <ComponentRow
            label="Standing jump"
            current={`${resolved.currentFitness.standingJumpCm}cm`}
            target={`${targetCpfi.componentTargets.standingJumpCm}cm`}
            score={currentCpfi.componentScores.standingJump}
          />
          <ComponentRow
            label="Back ext."
            current={String(resolved.currentFitness.backExtensionReps)}
            target={String(targetCpfi.componentTargets.backExtensionReps)}
            score={currentCpfi.componentScores.backExtension}
          />
        </div>

        <PhaseTimeline macrocycles={plan.macrocycles} totalWeeks={plan.totalWeeks} />
      </div>

      <div className="weeks-list">
        {plan.weeks.map((week) => (
          <WeekCard key={week.weekNumber} week={week} />
        ))}
      </div>
    </div>
  );
}

function ComponentRow({
  label,
  current,
  target,
  score,
}: {
  label: string;
  current: string;
  target: string;
  score: number;
}) {
  const dots = Array.from({ length: 3 }, (_, i) => (
    <span key={i} className={`score-dot ${i < score ? "filled" : ""}`} />
  ));

  return (
    <div className="component-row">
      <span className="comp-label">{label}</span>
      <span className="comp-current">{current}</span>
      <span className="comp-arrow">&rarr;</span>
      <span className="comp-target">{target}</span>
      <span className="comp-score">{dots}</span>
    </div>
  );
}
