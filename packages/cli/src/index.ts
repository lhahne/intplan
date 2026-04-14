#!/usr/bin/env node

import { generatePlan } from "@intplan/core";
import { runWizard } from "./wizard.js";
import { displayPlan } from "./display.js";
import { writeExport } from "./export.js";
import { select } from "@inquirer/prompts";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse simple flags
  const formatIdx = args.indexOf("--format");
  const outputIdx = args.indexOf("--output");
  const weeksIdx = args.indexOf("--weeks");

  const format = formatIdx >= 0 ? (args[formatIdx + 1] as "json" | "md") : undefined;
  const output = outputIdx >= 0 ? args[outputIdx + 1] : undefined;
  const weeksArg = weeksIdx >= 0 ? args[weeksIdx + 1] : undefined;

  // Collect user profile via wizard
  const profile = await runWizard();

  // Generate the plan
  console.log("\nGenerating your training plan...\n");
  const plan = generatePlan(profile);

  // Parse week range
  let weekRange: { start: number; end: number } | undefined;
  if (weeksArg) {
    const parts = weeksArg.split("-");
    const start = parseInt(parts[0]!, 10);
    const end = parts[1] ? parseInt(parts[1], 10) : start;
    weekRange = { start, end };
  }

  // Display the plan
  displayPlan(plan, weekRange);

  // If format specified via flag, export directly
  if (format) {
    writeExport(plan, format, output);
    return;
  }

  // Interactive: ask what to do next
  const action = await select({
    message: "What would you like to do?",
    choices: [
      { name: "Show all weeks", value: "all" },
      { name: "Export as Markdown", value: "md" },
      { name: "Export as JSON", value: "json" },
      { name: "Exit", value: "exit" },
    ],
  });

  switch (action) {
    case "all":
      displayPlan(plan, { start: 1, end: plan.totalWeeks });
      break;
    case "md":
      writeExport(plan, "md", output ?? "training-plan.md");
      break;
    case "json":
      writeExport(plan, "json", output ?? "training-plan.json");
      break;
  }
}

main().catch((err) => {
  if (err instanceof Error && err.message.includes("User force closed")) {
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
