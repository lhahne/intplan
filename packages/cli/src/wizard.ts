import { input, select, checkbox, number, confirm } from "@inquirer/prompts";
import type {
  UserProfile,
  Equipment,
  ServiceLevel,
  FitnessEstimate,
  FitnessInput,
  FitnessBaseline,
} from "@intplan/core";
import { estimateBaselines } from "@intplan/core";

export async function runWizard(): Promise<UserProfile> {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   INTPLAN - Military Service Training Plan   ║");
  console.log("║   Prepare for Finnish Defence Forces         ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const serviceDate = await input({
    message: "Service start date (YYYY-MM-DD):",
    validate: (val) => {
      const d = new Date(val);
      if (isNaN(d.getTime())) return "Enter a valid date (YYYY-MM-DD)";
      if (d <= new Date()) return "Date must be in the future";
      return true;
    },
  });

  const targetServiceLevel = await select<ServiceLevel>({
    message: "Target service level:",
    choices: [
      { name: "Basic (6 months)", value: "basic" },
      { name: "NCO / Specialist (9-12 months)", value: "nco" },
      { name: "Special Forces (12 months)", value: "special_forces" },
    ],
  });

  // Fitness input mode
  const fitnessInput = await collectFitnessInput();

  const maxTrainingDays = await select<3 | 4 | 5 | 6>({
    message: "Max training days per week you can commit to:",
    choices: [
      { name: "3 days", value: 3 as const },
      { name: "4 days", value: 4 as const },
      { name: "5 days", value: 5 as const },
      { name: "6 days", value: 6 as const },
    ],
  });

  const availableEquipment = await checkbox<Equipment>({
    message: "Available equipment (space to select):",
    choices: [
      { name: "Pull-up bar", value: "pull_up_bar" },
      { name: "Dumbbells", value: "dumbbells" },
      { name: "Barbell + rack", value: "barbell" },
      { name: "Kettlebell", value: "kettlebell" },
      { name: "Resistance bands", value: "resistance_bands" },
      { name: "Bench", value: "bench" },
      { name: "Sandbag", value: "sandbag" },
      { name: "Battle rope", value: "battle_rope" },
      { name: "Full gym access", value: "gym_full" },
    ],
  });

  const equipment: Equipment[] = ["bodyweight", ...availableEquipment];

  return {
    serviceDate,
    targetServiceLevel,
    maxTrainingDays,
    availableEquipment: equipment,
    fitnessInput,
  };
}

async function collectFitnessInput(): Promise<FitnessInput> {
  const mode = await select<"tested" | "estimated">({
    message: "How would you like to describe your current fitness?",
    choices: [
      {
        name: "Rough estimate (describe your fitness level)",
        value: "estimated",
      },
      {
        name: "Test results (I know my exact numbers)",
        value: "tested",
      },
    ],
  });

  if (mode === "tested") {
    return { type: "tested", baseline: await collectExactBaseline() };
  }

  // Estimate mode
  const level = await select<FitnessEstimate>({
    message: "How would you describe your overall fitness?",
    choices: [
      {
        name: "Untrained - mostly sedentary, no regular exercise",
        value: "untrained",
      },
      {
        name: "Beginner - some activity (walks, occasional gym), nothing structured",
        value: "beginner",
      },
      {
        name: "Moderate - regular exercise 2-3x/week, decent base",
        value: "moderate",
      },
      {
        name: "Athletic - consistent training 4+x/week, good all-around fitness",
        value: "athletic",
      },
      {
        name: "Competitive - serious training background, sports/military experience",
        value: "competitive",
      },
    ],
  });

  const base = estimateBaselines[level];
  console.log(`\n  Estimated baseline: Cooper ~${base.cooperMeters}m, push-ups ~${base.pushUps}, pull-ups ~${base.pullUps}`);

  const wantOverrides = await confirm({
    message: "Do you know any specific numbers you'd like to correct?",
    default: false,
  });

  let overrides: Partial<FitnessBaseline> | undefined;

  if (wantOverrides) {
    overrides = await collectOverrides(base);
  }

  return { type: "estimated", level, overrides };
}

async function collectExactBaseline(): Promise<FitnessBaseline> {
  console.log("\n--- Current Fitness Test Results ---\n");

  const cooperMeters = (await number({
    message: "Cooper test - 12 min run (meters):",
    default: 2000,
    min: 500,
    max: 4000,
  }))!;

  const pushUps = (await number({
    message: "Push-ups in 60 seconds:",
    default: 15,
    min: 0,
    max: 100,
  }))!;

  const sitUps = (await number({
    message: "Sit-ups in 60 seconds:",
    default: 15,
    min: 0,
    max: 100,
  }))!;

  const pullUps = (await number({
    message: "Pull-ups (max reps):",
    default: 3,
    min: 0,
    max: 50,
  }))!;

  const standingJumpCm = (await number({
    message: "Standing long jump (cm):",
    default: 180,
    min: 50,
    max: 350,
  }))!;

  const backExtensionReps = (await number({
    message: "Back extensions in 60 seconds:",
    default: 25,
    min: 0,
    max: 100,
  }))!;

  return { cooperMeters, pushUps, sitUps, pullUps, standingJumpCm, backExtensionReps };
}

async function collectOverrides(base: FitnessBaseline): Promise<Partial<FitnessBaseline>> {
  console.log("\n  Enter values you know. Press enter to keep the estimate.\n");
  const overrides: Partial<FitnessBaseline> = {};

  const fields: { key: keyof FitnessBaseline; label: string }[] = [
    { key: "cooperMeters", label: "Cooper test (meters)" },
    { key: "pushUps", label: "Push-ups in 60s" },
    { key: "sitUps", label: "Sit-ups in 60s" },
    { key: "pullUps", label: "Pull-ups (max)" },
    { key: "standingJumpCm", label: "Standing jump (cm)" },
    { key: "backExtensionReps", label: "Back extensions in 60s" },
  ];

  for (const field of fields) {
    const val = await input({
      message: `${field.label} [${base[field.key]}]:`,
      default: "",
    });

    if (val.trim() !== "") {
      const n = parseInt(val, 10);
      if (!isNaN(n)) {
        overrides[field.key] = n;
      }
    }
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined!;
}
