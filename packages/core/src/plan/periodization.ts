import type { Macrocycle, TrainingPhase } from "../types/plan.js";

interface PhaseAllocation {
  phase: TrainingPhase;
  weeks: number;
  description: string;
  isTransition?: boolean;
}

const CYCLE_1_BASE = 14; // adapt(3) + aero(4) + build(4) + end(3)
const CYCLE_N_BASE = 12; // aero(4) + build(4) + end(4)
const FINAL_WEEKS = 5; // peaking(3) + taper(2)
const MIN_CYCLE = 8;
const MAX_PHASE_WEEKS = 6;

function buildCycle(cycleIndex: number, weeks: number): PhaseAllocation[] {
  const allocs: PhaseAllocation[] = [];
  let remaining = weeks;

  if (cycleIndex === 0) {
    allocs.push({
      phase: "anatomical_adaptation",
      weeks: 3,
      description: "Build movement foundations and joint resilience",
    });
    remaining -= 3;
  }

  // Split remaining across 3 training phases
  const basePerPhase = Math.floor(remaining / 3);
  let extra = remaining - basePerPhase * 3;

  // Priority: strength_endurance, aerobic_base, strength_build
  const phaseWeeks = [basePerPhase, basePerPhase, basePerPhase]; // [aero, build, end]
  const extraOrder = [2, 0, 1]; // str_end first, then aero, then build
  for (const idx of extraOrder) {
    if (extra > 0 && phaseWeeks[idx]! < MAX_PHASE_WEEKS) {
      phaseWeeks[idx]!++;
      extra--;
    }
  }

  const suffix = cycleIndex === 0 ? "" : cycleIndex === 1 ? " — higher intensity" : ` — cycle ${cycleIndex + 1}`;

  allocs.push(
    { phase: "aerobic_base", weeks: phaseWeeks[0]!, description: `Develop aerobic endurance${suffix}` },
    { phase: "strength_build", weeks: phaseWeeks[1]!, description: `Build maximal strength${suffix}` },
    { phase: "strength_endurance", weeks: phaseWeeks[2]!, description: `Develop muscular endurance${suffix}` },
  );

  return allocs;
}

export function allocatePhases(totalWeeks: number): Macrocycle[] {
  let allocations: PhaseAllocation[];

  if (totalWeeks >= 30) {
    allocations = [];
    const availableForCycles = totalWeeks - FINAL_WEEKS;
    const remainingAfterCycle1 = availableForCycles - CYCLE_1_BASE;

    // Determine number of additional cycles
    let additionalCycles: number;
    let leftover: number;

    // Each additional cycle costs CYCLE_N_BASE + 1 (transition week between cycles)
    const cycleWithTransition = CYCLE_N_BASE + 1;

    if (remainingAfterCycle1 < MIN_CYCLE + 1) {
      additionalCycles = 0;
      leftover = remainingAfterCycle1;
    } else {
      additionalCycles = Math.floor(remainingAfterCycle1 / cycleWithTransition);
      leftover = remainingAfterCycle1 - additionalCycles * cycleWithTransition;
      // If leftover can form another shorter cycle (+ transition week), absorb it
      if (leftover >= MIN_CYCLE + 1) {
        additionalCycles++;
      }
    }

    // Build cycle 1 (with leftover absorbed if no additional cycles)
    const cycle1Weeks = CYCLE_1_BASE + (additionalCycles === 0 ? leftover : 0);
    allocations.push(...buildCycle(0, cycle1Weeks));

    // Build additional cycles with transition weeks between them
    let remainingForCycles = remainingAfterCycle1;
    for (let i = 0; i < additionalCycles; i++) {
      // Insert a transition week between cycles
      allocations.push({
        phase: "aerobic_base",
        weeks: 1,
        description: "Transition week — lighter volume between training blocks",
        isTransition: true,
      });
      remainingForCycles -= 1;

      const isLast = i === additionalCycles - 1;
      const cycleWeeks = isLast ? remainingForCycles : CYCLE_N_BASE;
      allocations.push(...buildCycle(i + 1, cycleWeeks));
      remainingForCycles -= isLast ? 0 : CYCLE_N_BASE;
    }

    // Final block
    allocations.push(
      { phase: "peaking", weeks: 3, description: "Sport-specific test preparation and peak performance" },
      { phase: "taper", weeks: 2, description: "Reduce volume, maintain intensity, arrive fresh" },
    );
  } else if (totalWeeks >= 24) {
    const remaining = totalWeeks - 24;
    const extraAerobic = Math.floor(remaining / 2);
    const extraStrEnd = remaining - extraAerobic;
    allocations = [
      { phase: "anatomical_adaptation", weeks: 3, description: "Build movement foundations and joint resilience" },
      { phase: "aerobic_base", weeks: 6 + extraAerobic, description: "Develop aerobic endurance and running base" },
      { phase: "strength_build", weeks: 5, description: "Build maximal strength and muscle" },
      { phase: "strength_endurance", weeks: 5 + extraStrEnd, description: "Develop muscular endurance and work capacity" },
      { phase: "peaking", weeks: 3, description: "Sport-specific test preparation and peak performance" },
      { phase: "taper", weeks: 2, description: "Reduce volume, maintain intensity, arrive fresh" },
    ];
  } else if (totalWeeks >= 16) {
    const remaining = totalWeeks - 16;
    const extraAerobic = Math.floor(remaining / 2);
    const extraStrEnd = remaining - extraAerobic;
    allocations = [
      { phase: "anatomical_adaptation", weeks: 2, description: "Build movement foundations" },
      { phase: "aerobic_base", weeks: 4 + extraAerobic, description: "Develop aerobic endurance" },
      { phase: "strength_build", weeks: 4, description: "Build strength" },
      { phase: "strength_endurance", weeks: 3 + extraStrEnd, description: "Develop muscular endurance" },
      { phase: "peaking", weeks: 2, description: "Test preparation" },
      { phase: "taper", weeks: 1, description: "Reduce volume, arrive fresh" },
    ];
  } else if (totalWeeks >= 8) {
    const remaining = totalWeeks - 8;
    allocations = [
      { phase: "aerobic_base", weeks: 3, description: "Build aerobic base quickly" },
      { phase: "strength_build", weeks: 3, description: "Build essential strength" },
      { phase: "strength_endurance", weeks: Math.max(1, remaining), description: "Muscular endurance" },
      { phase: "peaking", weeks: 1, description: "Test preparation" },
      { phase: "taper", weeks: 1, description: "Rest before service" },
    ];
  } else {
    // Less than 8 weeks - compressed
    const mainWeeks = Math.max(1, totalWeeks - 2);
    allocations = [
      { phase: "strength_endurance", weeks: mainWeeks, description: "Concurrent cardio and strength endurance" },
      { phase: "peaking", weeks: Math.min(1, totalWeeks - 1), description: "Final test preparation" },
      { phase: "taper", weeks: Math.min(1, totalWeeks), description: "Brief rest" },
    ];
  }

  // Convert to macrocycles with week numbers
  let currentWeek = 1;
  const macrocycles: Macrocycle[] = [];

  for (const alloc of allocations) {
    if (alloc.weeks <= 0) continue;
    macrocycles.push({
      phase: alloc.phase,
      startWeek: currentWeek,
      endWeek: currentWeek + alloc.weeks - 1,
      description: alloc.description,
      ...(alloc.isTransition ? { isTransition: true } : {}),
    });
    currentWeek += alloc.weeks;
  }

  return macrocycles;
}
