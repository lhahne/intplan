import { useState, useMemo } from "react";
import type {
  UserProfile,
  FitnessInput,
  FitnessEstimate,
  Equipment,
  ServiceLevel,
  TrainingPlan,
} from "@intplan/core";
import { generatePlan } from "@intplan/core";

function defaultServiceDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split("T")[0]!;
}

const defaultFitnessInput: FitnessInput = {
  type: "estimated",
  level: "beginner",
};

function buildProfile(state: ProfileState): UserProfile {
  return {
    serviceDate: state.serviceDate,
    targetServiceLevel: state.serviceLevel,
    maxTrainingDays: state.maxTrainingDays,
    availableEquipment: ["bodyweight" as Equipment, ...state.equipment],
    fitnessInput: state.fitnessInput,
  };
}

export interface ProfileState {
  serviceDate: string;
  serviceLevel: ServiceLevel;
  maxTrainingDays: 3 | 4 | 5 | 6;
  equipment: Equipment[];
  fitnessInput: FitnessInput;
}

export interface PlanResult {
  plan: TrainingPlan | null;
  error: string | null;
}

export function usePlan() {
  const [state, setState] = useState<ProfileState>({
    serviceDate: defaultServiceDate(),
    serviceLevel: "basic",
    maxTrainingDays: 4,
    equipment: [],
    fitnessInput: defaultFitnessInput,
  });

  const result = useMemo<PlanResult>(() => {
    try {
      const profile = buildProfile(state);
      const plan = generatePlan(profile);
      return { plan, error: null };
    } catch (e) {
      return { plan: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [state]);

  const update = <K extends keyof ProfileState>(
    key: K,
    value: ProfileState[K],
  ) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const updateFitnessInput = (input: FitnessInput) => {
    setState((prev) => ({ ...prev, fitnessInput: input }));
  };

  const setEstimateLevel = (level: FitnessEstimate) => {
    setState((prev) => {
      const current = prev.fitnessInput;
      if (current.type === "estimated") {
        return {
          ...prev,
          fitnessInput: { ...current, level },
        };
      }
      return {
        ...prev,
        fitnessInput: { type: "estimated", level },
      };
    });
  };

  const setOverride = (key: string, value: number | undefined) => {
    setState((prev) => {
      const current = prev.fitnessInput;
      if (current.type !== "estimated") return prev;
      const overrides = { ...current.overrides, [key]: value };
      // Clean up undefined values
      for (const k of Object.keys(overrides)) {
        if (overrides[k as keyof typeof overrides] === undefined) {
          delete overrides[k as keyof typeof overrides];
        }
      }
      return {
        ...prev,
        fitnessInput: {
          ...current,
          overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
        },
      };
    });
  };

  const setBaseline = (key: string, value: number) => {
    setState((prev) => {
      const current = prev.fitnessInput;
      if (current.type !== "tested") return prev;
      return {
        ...prev,
        fitnessInput: {
          ...current,
          baseline: { ...current.baseline, [key]: value },
        },
      };
    });
  };

  return {
    state,
    update,
    updateFitnessInput,
    setEstimateLevel,
    setOverride,
    setBaseline,
    ...result,
  };
}
