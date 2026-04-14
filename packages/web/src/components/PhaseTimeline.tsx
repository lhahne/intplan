import type { Macrocycle } from "@intplan/core";

const phaseLabels: Record<string, string> = {
  anatomical_adaptation: "Adapt",
  aerobic_base: "Aerobic",
  strength_build: "Strength",
  strength_endurance: "Endurance",
  peaking: "Peak",
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

interface Props {
  macrocycles: Macrocycle[];
  totalWeeks: number;
  onPhaseClick?: (startWeek: number) => void;
}

export function PhaseTimeline({ macrocycles, totalWeeks, onPhaseClick }: Props) {
  return (
    <div className="phase-timeline">
      {macrocycles.map((m) => {
        const weeks = m.endWeek - m.startWeek + 1;
        const pct = (weeks / totalWeeks) * 100;
        return (
          <div
            key={m.startWeek}
            className="phase-segment"
            style={{
              width: `${pct}%`,
              backgroundColor: phaseColors[m.phase] ?? "#6b7280",
            }}
            title={`${m.description} (W${m.startWeek}-${m.endWeek})`}
            onClick={() => onPhaseClick?.(m.startWeek)}
          >
            {pct > 8 && (
              <span className="phase-label">
                {phaseLabels[m.phase] ?? m.phase}
                <span className="phase-weeks">{weeks}w</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
