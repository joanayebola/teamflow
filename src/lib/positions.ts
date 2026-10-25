/**
 * Fractional position helpers for Kanban ordering.
 *
 * Tasks carry a float `position` inside their column. A new/moved task gets
 * the midpoint between its neighbours; when neighbours get too close
 * (gap below MIN_GAP) the column is rebalanced to evenly spaced positions.
 */
export const POSITION_STEP = 1000;
export const MIN_GAP = 0.001;

/** Position for an item appended to the end of a list. */
export function positionAtEnd(lastPosition: number | null | undefined): number {
  return (lastPosition ?? 0) + POSITION_STEP;
}

/** Position for an item inserted at the start of a list. */
export function positionAtStart(firstPosition: number | null | undefined): number {
  return (firstPosition ?? POSITION_STEP) - POSITION_STEP;
}

/**
 * Position between two neighbours. Either neighbour may be null (list edge).
 * Returns null when the gap is too small and the caller must rebalance.
 */
export function positionBetween(
  before: number | null,
  after: number | null,
): number | null {
  if (before === null && after === null) return POSITION_STEP;
  if (before === null) return (after as number) - POSITION_STEP;
  if (after === null) return before + POSITION_STEP;
  const gap = after - before;
  if (gap < MIN_GAP) return null;
  return before + gap / 2;
}

/** Evenly spaced positions for `count` items, used when rebalancing. */
export function rebalancedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_STEP);
}

/**
 * Compute the position for inserting at `index` within an ordered list of
 * existing positions (excluding the moving item itself).
 * Returns null when a rebalance is required first.
 */
export function insertionPosition(
  orderedPositions: number[],
  index: number,
): number | null {
  const before = index > 0 ? orderedPositions[index - 1] : null;
  const after = index < orderedPositions.length ? orderedPositions[index] : null;
  return positionBetween(before, after);
}
