import type { Macrocycle, TrainingPhase } from "../types/plan.js";

interface PhaseAllocation {
  phase: TrainingPhase;
  weeks: number;
  description: string;
}

export function allocatePhases(totalWeeks: number): Macrocycle[] {
  let allocations: PhaseAllocation[];

  if (totalWeeks >= 24) {
    const remaining = totalWeeks - 24;
    // Distribute extra weeks to aerobic_base and strength_endurance
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
    });
    currentWeek += alloc.weeks;
  }

  return macrocycles;
}
