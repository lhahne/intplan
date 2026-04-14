import type {
  Equipment,
  ServiceLevel,
  TrainingBackground,
  FitnessEstimate,
  FitnessBaseline,
  FeasibilityResult,
} from "@intplan/core";
import { estimateBaselines } from "@intplan/core";
import type { ProfileState } from "../hooks/usePlan.ts";

interface Props {
  state: ProfileState;
  update: <K extends keyof ProfileState>(key: K, value: ProfileState[K]) => void;
  updateFitnessInput: (input: ProfileState["fitnessInput"]) => void;
  setEstimateLevel: (level: FitnessEstimate) => void;
  setOverride: (key: string, value: number | undefined) => void;
  setBaseline: (key: string, value: number) => void;
  feasibility: FeasibilityResult | null;
}

const equipmentOptions: { value: Equipment; label: string }[] = [
  { value: "pull_up_bar", label: "Pull-up bar" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "barbell", label: "Barbell + rack" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "resistance_bands", label: "Bands" },
  { value: "bench", label: "Bench" },
  { value: "sandbag", label: "Sandbag" },
  { value: "battle_rope", label: "Battle rope" },
  { value: "gym_full", label: "Full gym" },
];

const estimateLevels: { value: FitnessEstimate; label: string; desc: string }[] = [
  { value: "untrained", label: "Untrained", desc: "Mostly sedentary" },
  { value: "beginner", label: "Beginner", desc: "Some activity, nothing structured" },
  { value: "moderate", label: "Moderate", desc: "Regular exercise 2-3x/week" },
  { value: "athletic", label: "Athletic", desc: "Consistent training 4+x/week" },
  { value: "competitive", label: "Competitive", desc: "Serious training background" },
];

const baselineFields: { key: keyof FitnessBaseline; label: string; unit: string; min: number; max: number }[] = [
  { key: "cooperMeters", label: "Cooper test", unit: "m", min: 500, max: 4000 },
  { key: "pushUps", label: "Push-ups / 60s", unit: "", min: 0, max: 100 },
  { key: "sitUps", label: "Sit-ups / 60s", unit: "", min: 0, max: 100 },
  { key: "pullUps", label: "Pull-ups max", unit: "", min: 0, max: 50 },
  { key: "standingJumpCm", label: "Standing jump", unit: "cm", min: 50, max: 350 },
  { key: "backExtensionReps", label: "Back ext. / 60s", unit: "", min: 0, max: 100 },
];

const serviceLevelLabels: Record<ServiceLevel, string> = {
  basic: "Basic",
  nco: "NCO / Specialist",
  special_forces: "Special Forces",
};

export function ParameterPanel({
  state,
  update,
  updateFitnessInput,
  setEstimateLevel,
  setOverride,
  setBaseline,
  feasibility,
}: Props) {
  const fi = state.fitnessInput;
  const isEstimated = fi.type === "estimated";
  const estimateLevel = fi.type === "estimated" ? fi.level : "beginner";
  const overrides = fi.type === "estimated" ? fi.overrides : undefined;
  const baseline = fi.type === "tested" ? fi.baseline : undefined;
  const estimateBase: FitnessBaseline | undefined = fi.type === "estimated"
    ? estimateBaselines[fi.level]
    : undefined;

  return (
    <div className="panel">
      <h2>Parameters</h2>

      {/* Service section */}
      <div className="panel-section">
        <div className="panel-section-title">Service</div>
        <label className="field">
          <span className="field-label">Service date</span>
          <input
            type="date"
            value={state.serviceDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => update("serviceDate", e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Service level</span>
          <select
            value={state.serviceLevel}
            onChange={(e) => update("serviceLevel", e.target.value as ServiceLevel)}
          >
            <option value="basic">Basic (6 months)</option>
            <option value="nco">NCO / Specialist (9-12 months)</option>
            <option value="special_forces">Special Forces (12 months)</option>
          </select>
        </label>
      </div>

      {feasibility && !feasibility.feasible && (
        <div className="feasibility-warning">
          <div className="feasibility-warning-text">
            Your current fitness level may need more preparation time for{" "}
            <strong>{serviceLevelLabels[state.serviceLevel]}</strong>. The main
            bottleneck is your <strong>{feasibility.bottleneck}</strong> — we
            recommend at least <strong>{feasibility.recommendedWeeks} weeks</strong>{" "}
            (you have {feasibility.availableWeeks}).
          </div>
          <button
            className="feasibility-btn"
            onClick={() => update("serviceDate", feasibility.recommendedDate)}
          >
            Use suggested date ({feasibility.recommendedDate})
          </button>
        </div>
      )}

      {/* Training section */}
      <div className="panel-section">
        <div className="panel-section-title">Training</div>
        <label className="field">
          <span className="field-label">Training background</span>
          <select
            value={state.trainingBackground}
            onChange={(e) => update("trainingBackground", e.target.value as TrainingBackground)}
          >
            <option value="never_trained">Never trained</option>
            <option value="deconditioned">Trained before, currently inactive</option>
            <option value="currently_active">Currently active</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Max days / week</span>
          <select
            value={state.maxTrainingDays}
            onChange={(e) =>
              update("maxTrainingDays", Number(e.target.value) as 3 | 4 | 5 | 6)
            }
          >
            <option value="3">3 days</option>
            <option value="4">4 days</option>
            <option value="5">5 days</option>
            <option value="6">6 days</option>
          </select>
        </label>
        <fieldset className="field">
          <legend className="field-label">Equipment</legend>
          <div className="equipment-grid">
            {equipmentOptions.map((eq) => {
              const checked = state.equipment.includes(eq.value);
              return (
                <label
                  key={eq.value}
                  className={`equipment-chip${checked ? " selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...state.equipment, eq.value]
                        : state.equipment.filter((x) => x !== eq.value);
                      update("equipment", next);
                    }}
                  />
                  <span className="chip-check">{checked ? "\u2713" : ""}</span>
                  {eq.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* Fitness section */}
      <div className="panel-section">
        <div className="panel-section-title">Current Fitness</div>
        <div className="fitness-mode">
          <label className={`mode-btn ${isEstimated ? "active" : ""}`}>
            <input
              type="radio"
              name="fitnessMode"
              checked={isEstimated}
              onChange={() =>
                updateFitnessInput({ type: "estimated", level: estimateLevel })
              }
            />
            Estimate
          </label>
          <label className={`mode-btn ${!isEstimated ? "active" : ""}`}>
            <input
              type="radio"
              name="fitnessMode"
              checked={!isEstimated}
              onChange={() =>
                updateFitnessInput({
                  type: "tested",
                  baseline: estimateBase ?? estimateBaselines.beginner,
                })
              }
            />
            Test results
          </label>
        </div>

        {isEstimated ? (
          <>
            <div className="level-cards">
              {estimateLevels.map((l) => (
                <div
                  key={l.value}
                  className={`level-card${estimateLevel === l.value ? " selected" : ""}`}
                  onClick={() => setEstimateLevel(l.value)}
                >
                  <div className="level-card-name">{l.label}</div>
                  <div className="level-card-desc">{l.desc}</div>
                </div>
              ))}
            </div>

            {estimateBase && (
              <div className="estimate-preview">
                <span className="preview-label">Estimated values (override any):</span>
                {baselineFields.map((f) => {
                  const est = estimateBase[f.key];
                  const ov = overrides?.[f.key];
                  return (
                    <label key={f.key} className="override-field">
                      <span>{f.label}</span>
                      <input
                        type="number"
                        placeholder={String(est)}
                        value={ov ?? ""}
                        min={f.min}
                        max={f.max}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOverride(f.key, v === "" ? undefined : Number(v));
                        }}
                      />
                      {f.unit && <span className="unit">{f.unit}</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="tested-section">
            {baselineFields.map((f) => (
              <label key={f.key} className="override-field">
                <span>{f.label}</span>
                <input
                  type="number"
                  value={baseline?.[f.key] ?? ""}
                  min={f.min}
                  max={f.max}
                  onChange={(e) => setBaseline(f.key, Number(e.target.value))}
                />
                {f.unit && <span className="unit">{f.unit}</span>}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
