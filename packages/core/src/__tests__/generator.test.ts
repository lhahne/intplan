import { describe, it, expect } from "vitest";
import { generatePlan } from "../plan/generator.js";
import type { UserProfile } from "../types/profile.js";

function makeProfile(overrides?: Partial<UserProfile>): UserProfile {
  const future = new Date();
  future.setMonth(future.getMonth() + 6);
  const serviceDate = future.toISOString().split("T")[0]!;

  return {
    serviceDate,
    targetServiceLevel: "basic",
    maxTrainingDays: 4,
    availableEquipment: ["bodyweight", "pull_up_bar"],
    fitnessInput: {
      type: "tested",
      baseline: {
        cooperMeters: 2200,
        pushUps: 20,
        sitUps: 22,
        pullUps: 3,
        standingJumpCm: 190,
        backExtensionReps: 30,
      },
    },
    ...overrides,
  };
}

describe("generatePlan", () => {
  it("generates a plan with correct structure", () => {
    const plan = generatePlan(makeProfile());

    expect(plan.totalWeeks).toBeGreaterThan(0);
    expect(plan.weeks).toHaveLength(plan.totalWeeks);
    expect(plan.macrocycles.length).toBeGreaterThan(0);
    expect(plan.currentCpfi.cpfi).toBeGreaterThan(0);
    expect(plan.resolved.currentFitness.cooperMeters).toBe(2200);
  });

  it("each week has 7 days", () => {
    const plan = generatePlan(makeProfile());
    for (const week of plan.weeks) {
      expect(week.days).toHaveLength(7);
    }
  });

  it("dynamic training days respect max", () => {
    const plan = generatePlan(makeProfile({ maxTrainingDays: 3 }));
    for (const week of plan.weeks) {
      const trainingDays = week.days.filter((d) => d.type === "training").length;
      expect(trainingDays).toBeLessThanOrEqual(3);
      expect(week.trainingDays).toBeLessThanOrEqual(3);
    }
  });

  it("unfit users start with fewer training days", () => {
    const unfit = generatePlan(makeProfile({
      fitnessInput: { type: "estimated", level: "untrained" },
      maxTrainingDays: 6,
    }));
    const fit = generatePlan(makeProfile({
      fitnessInput: { type: "estimated", level: "athletic" },
      maxTrainingDays: 6,
    }));

    // First week: unfit should have fewer training days than fit
    expect(unfit.weeks[0]!.trainingDays).toBeLessThanOrEqual(fit.weeks[0]!.trainingDays);
  });

  it("training days increase over the plan", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const plan = generatePlan(makeProfile({
      serviceDate: future.toISOString().split("T")[0]!,
      maxTrainingDays: 6,
      fitnessInput: { type: "estimated", level: "beginner" },
    }));

    // Average training days in first quarter vs last quarter (before taper)
    const quarter = Math.floor(plan.totalWeeks / 4);
    const firstQ = plan.weeks.slice(0, quarter);
    const thirdQ = plan.weeks.slice(quarter * 2, quarter * 3);

    const avgFirst = firstQ.reduce((s, w) => s + w.trainingDays, 0) / firstQ.length;
    const avgThird = thirdQ.reduce((s, w) => s + w.trainingDays, 0) / thirdQ.length;

    expect(avgThird).toBeGreaterThanOrEqual(avgFirst);
  });

  it("Sunday is always rest", () => {
    const plan = generatePlan(makeProfile());
    for (const week of plan.weeks) {
      const sunday = week.days.find((d) => d.dayOfWeek === 6);
      expect(sunday?.type).toBe("rest");
    }
  });

  it("generates for all service levels", () => {
    for (const level of ["basic", "nco", "special_forces"] as const) {
      const plan = generatePlan(makeProfile({ targetServiceLevel: level }));
      expect(plan.targetCpfi.targetCpfi).toBeGreaterThan(0);
      expect(plan.weeks.length).toBeGreaterThan(0);
    }
  });

  it("works with estimated fitness input", () => {
    for (const level of ["untrained", "beginner", "moderate", "athletic", "competitive"] as const) {
      const plan = generatePlan(makeProfile({
        fitnessInput: { type: "estimated", level },
      }));
      expect(plan.resolved.currentFitness.cooperMeters).toBeGreaterThan(0);
      expect(plan.weeks.length).toBeGreaterThan(0);
    }
  });

  it("estimated input with overrides applies overrides", () => {
    const plan = generatePlan(makeProfile({
      fitnessInput: {
        type: "estimated",
        level: "beginner",
        overrides: { pullUps: 12, cooperMeters: 3000 },
      },
    }));
    expect(plan.resolved.currentFitness.pullUps).toBe(12);
    expect(plan.resolved.currentFitness.cooperMeters).toBe(3000);
    // Non-overridden values should come from beginner baseline
    expect(plan.resolved.currentFitness.pushUps).toBe(18);
  });

  it("generates for bodyweight-only equipment", () => {
    const plan = generatePlan(makeProfile({ availableEquipment: ["bodyweight"] }));
    expect(plan.weeks.length).toBeGreaterThan(0);
    for (const week of plan.weeks) {
      for (const day of week.days) {
        for (const session of day.sessions) {
          expect(session.exercises.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("marks deload weeks correctly", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const plan = generatePlan(makeProfile({ serviceDate: future.toISOString().split("T")[0]! }));

    const deloadWeeks = plan.weeks.filter((w) => w.isDeload);
    expect(deloadWeeks.length).toBeGreaterThan(0);
  });

  it("throws for past service date", () => {
    expect(() =>
      generatePlan(makeProfile({ serviceDate: "2020-01-01" })),
    ).toThrow("Service date must be in the future");
  });

  it("populates weeklyRunningKm on every week", () => {
    const plan = generatePlan(makeProfile());
    for (const week of plan.weeks) {
      expect(week.weeklyRunningKm).toBeDefined();
      expect(week.weeklyRunningKm).toBeGreaterThanOrEqual(0);
    }
  });

  it("populates readinessGuidance on every week", () => {
    const plan = generatePlan(makeProfile());
    for (const week of plan.weeks) {
      expect(week.readinessGuidance).toBeDefined();
      expect(week.readinessGuidance!.length).toBeGreaterThan(0);
    }
  });

  it("training sessions have warm-up and cool-down where appropriate", () => {
    const plan = generatePlan(makeProfile());
    let hasWarmUp = false;
    for (const week of plan.weeks) {
      for (const day of week.days) {
        for (const session of day.sessions) {
          if (session.warmUp) hasWarmUp = true;
        }
      }
    }
    expect(hasWarmUp).toBe(true);
  });

  it("ruck exercises include loadKg", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const plan = generatePlan(makeProfile({
      serviceDate: future.toISOString().split("T")[0]!,
      maxTrainingDays: 5,
    }));
    let foundRuck = false;
    for (const week of plan.weeks) {
      for (const day of week.days) {
        for (const session of day.sessions) {
          if (session.category === "ruck_march") {
            for (const ex of session.exercises) {
              expect(ex.loadKg).toBeDefined();
              expect(ex.loadKg).toBeGreaterThan(0);
              foundRuck = true;
            }
          }
        }
      }
    }
    expect(foundRuck).toBe(true);
  });

  it("RPE targets are set for strength_endurance exercises in appropriate phases", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const plan = generatePlan(makeProfile({
      serviceDate: future.toISOString().split("T")[0]!,
    }));

    let foundRpe = false;
    for (const week of plan.weeks) {
      if (week.phase !== "strength_endurance" && week.phase !== "peaking") continue;
      for (const day of week.days) {
        for (const session of day.sessions) {
          if (session.category !== "strength_endurance") continue;
          for (const ex of session.exercises) {
            if (ex.rpeTarget) {
              foundRpe = true;
              expect(ex.rpeTarget[0]).toBeGreaterThanOrEqual(4);
              expect(ex.rpeTarget[1]).toBeLessThanOrEqual(10);
            }
          }
        }
      }
    }
    expect(foundRpe).toBe(true);
  });

  it("plyometric exercises have groundContacts in strength phases", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const plan = generatePlan(makeProfile({
      serviceDate: future.toISOString().split("T")[0]!,
      maxTrainingDays: 5,
    }));

    let foundGC = false;
    for (const week of plan.weeks) {
      for (const day of week.days) {
        for (const session of day.sessions) {
          if (session.category !== "lower_body_power") continue;
          for (const ex of session.exercises) {
            if (ex.groundContacts) {
              foundGC = true;
              expect(ex.groundContacts).toBeGreaterThan(0);
            }
          }
        }
      }
    }
    expect(foundGC).toBe(true);
  });

  it("training background is passed through to resolved profile", () => {
    const plan = generatePlan(makeProfile({ trainingBackground: "never_trained" }));
    expect(plan.resolved.trainingBackground).toBe("never_trained");
  });

  it("defaults trainingBackground to deconditioned", () => {
    const plan = generatePlan(makeProfile());
    expect(plan.resolved.trainingBackground).toBe("deconditioned");
  });
});
