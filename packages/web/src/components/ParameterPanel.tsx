import type {
  Equipment,
  ServiceLevel,
  FitnessEstimate,
  FitnessBaseline,
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
}

const equipmentOptions: { value: Equipment; label: string }[] = [
  { value: "pull_up_bar", label: "Pull-up bar" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "barbell", label: "Barbell + rack" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "resistance_bands", label: "Resistance bands" },
  { value: "bench", label: "Bench" },
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

export function ParameterPanel({
  state,
  update,
  updateFitnessInput,
  setEstimateLevel,
  setOverride,
  setBaseline,
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

      <label className="field">
        <span className="field-label">Max training days / week</span>
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
        <div className="checkbox-group">
          {equipmentOptions.map((eq) => (
            <label key={eq.value} className="checkbox-item">
              <input
                type="checkbox"
                checked={state.equipment.includes(eq.value)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...state.equipment, eq.value]
                    : state.equipment.filter((x) => x !== eq.value);
                  update("equipment", next);
                }}
              />
              {eq.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">Current fitness</legend>
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
          <div className="estimate-section">
            <select
              value={estimateLevel}
              onChange={(e) => setEstimateLevel(e.target.value as FitnessEstimate)}
              className="estimate-select"
            >
              {estimateLevels.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label} - {l.desc}
                </option>
              ))}
            </select>

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
          </div>
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
      </fieldset>
    </div>
  );
}
