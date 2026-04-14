// Scoring tables for Finnish Defence Forces fitness tests
// Each test scores 0-3 points based on performance thresholds

export interface ScoringThreshold {
  min: number;
  max: number; // Infinity for open-ended
  points: number;
}

export const pushUpScoring: ScoringThreshold[] = [
  { min: 0, max: 21, points: 0 },
  { min: 22, max: 29, points: 1 },
  { min: 30, max: 39, points: 2 },
  { min: 40, max: Infinity, points: 3 },
];

export const sitUpScoring: ScoringThreshold[] = [
  { min: 0, max: 21, points: 0 },
  { min: 22, max: 29, points: 1 },
  { min: 30, max: 39, points: 2 },
  { min: 40, max: Infinity, points: 3 },
];

export const pullUpScoring: ScoringThreshold[] = [
  { min: 0, max: 0, points: 0 },
  { min: 1, max: 5, points: 1 },
  { min: 6, max: 10, points: 2 },
  { min: 11, max: Infinity, points: 3 },
];

export const standingJumpScoring: ScoringThreshold[] = [
  { min: 0, max: 179, points: 0 },
  { min: 180, max: 199, points: 1 },
  { min: 200, max: 219, points: 2 },
  { min: 220, max: Infinity, points: 3 },
];

export const backExtensionScoring: ScoringThreshold[] = [
  { min: 0, max: 29, points: 0 },
  { min: 30, max: 39, points: 1 },
  { min: 40, max: 49, points: 2 },
  { min: 50, max: Infinity, points: 3 },
];

// Cooper test classification (meters)
export const cooperScoring: ScoringThreshold[] = [
  { min: 0, max: 1999, points: 0 },
  { min: 2000, max: 2199, points: 1 },
  { min: 2200, max: 2599, points: 2 },
  { min: 2600, max: 2999, points: 3 },
  { min: 3000, max: 3399, points: 4 },
  { min: 3400, max: Infinity, points: 5 },
];

/**
 * Score a muscle fitness test value against a scoring table.
 * Returns the points for the matching threshold, or 0 if no match.
 */
export function scoreTest(
  value: number,
  table: ScoringThreshold[],
): number {
  for (const threshold of table) {
    if (value >= threshold.min && value <= threshold.max) {
      return threshold.points;
    }
  }
  return 0;
}

/**
 * Classify a Cooper test result (meters) into a class 0-5.
 */
export function cooperClass(meters: number): number {
  return scoreTest(meters, cooperScoring);
}
