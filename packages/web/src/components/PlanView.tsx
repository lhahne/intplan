import { useState, useCallback } from "react";
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
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(() =>
    new Set([1, 2, 3, 4]),
  );

  const toggleWeek = useCallback((weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      return next;
    });
  }, []);

  const allExpanded = plan ? expandedWeeks.size === plan.weeks.length : false;

  const toggleAll = useCallback(() => {
    if (!plan) return;
    if (allExpanded) {
      setExpandedWeeks(new Set());
    } else {
      setExpandedWeeks(new Set(plan.weeks.map((w) => w.weekNumber)));
    }
  }, [plan, allExpanded]);

  const scrollToWeek = useCallback((weekNumber: number) => {
    const el = document.getElementById(`week-${weekNumber}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setExpandedWeeks((prev) => new Set([...prev, weekNumber]));
  }, []);

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
          <div
            className="summary-card summary-card--accent"
            style={{ "--card-accent": cpfiColor } as React.CSSProperties}
          >
            <span className="summary-label">Current CPFI</span>
            <span className="summary-value" style={{ color: cpfiColor }}>
              {currentCpfi.cpfi}
            </span>
            <span className="summary-sub">{currentCpfi.category}</span>
          </div>
          <div
            className="summary-card summary-card--accent"
            style={{ "--card-accent": "#22c55e" } as React.CSSProperties}
          >
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
            score={currentCpfi.cooperClass}
            currentValue={resolved.currentFitness.cooperMeters}
            targetValue={targetCpfi.targetCooperMeters}
          />
          <ComponentRow
            label="Push-ups"
            current={String(resolved.currentFitness.pushUps)}
            target={String(targetCpfi.componentTargets.pushUps)}
            score={currentCpfi.componentScores.pushUps}
            currentValue={resolved.currentFitness.pushUps}
            targetValue={targetCpfi.componentTargets.pushUps}
          />
          <ComponentRow
            label="Sit-ups"
            current={String(resolved.currentFitness.sitUps)}
            target={String(targetCpfi.componentTargets.sitUps)}
            score={currentCpfi.componentScores.sitUps}
            currentValue={resolved.currentFitness.sitUps}
            targetValue={targetCpfi.componentTargets.sitUps}
          />
          <ComponentRow
            label="Pull-ups"
            current={String(resolved.currentFitness.pullUps)}
            target={String(targetCpfi.componentTargets.pullUps)}
            score={currentCpfi.componentScores.pullUps}
            currentValue={resolved.currentFitness.pullUps}
            targetValue={targetCpfi.componentTargets.pullUps}
          />
          <ComponentRow
            label="Standing jump"
            current={`${resolved.currentFitness.standingJumpCm}cm`}
            target={`${targetCpfi.componentTargets.standingJumpCm}cm`}
            score={currentCpfi.componentScores.standingJump}
            currentValue={resolved.currentFitness.standingJumpCm}
            targetValue={targetCpfi.componentTargets.standingJumpCm}
          />
          <ComponentRow
            label="Back ext."
            current={String(resolved.currentFitness.backExtensionReps)}
            target={String(targetCpfi.componentTargets.backExtensionReps)}
            score={currentCpfi.componentScores.backExtension}
            currentValue={resolved.currentFitness.backExtensionReps}
            targetValue={targetCpfi.componentTargets.backExtensionReps}
          />
        </div>

        <PhaseTimeline
          macrocycles={plan.macrocycles}
          totalWeeks={plan.totalWeeks}
          onPhaseClick={scrollToWeek}
        />
      </div>

      <div className="weeks-header">
        <span className="weeks-title">Weekly Schedule ({plan.totalWeeks} weeks)</span>
        <button className="weeks-toggle-btn" onClick={toggleAll}>
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="weeks-list">
        {plan.weeks.map((week) => (
          <WeekCard
            key={week.weekNumber}
            week={week}
            expanded={expandedWeeks.has(week.weekNumber)}
            onToggle={() => toggleWeek(week.weekNumber)}
          />
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
  currentValue,
  targetValue,
}: {
  label: string;
  current: string;
  target: string;
  score: number;
  currentValue: number;
  targetValue: number;
}) {
  const dots = Array.from({ length: 3 }, (_, i) => (
    <span key={i} className={`score-dot ${i < score ? "filled" : ""}`} />
  ));

  const pct = targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0;

  return (
    <div className="component-row">
      <span className="comp-label">{label}</span>
      <span className="comp-current">{current}</span>
      <span className="comp-arrow">&rarr;</span>
      <span className="comp-target">{target}</span>
      <span className="comp-score">{dots}</span>
      <div className="comp-progress">
        <div className="comp-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
