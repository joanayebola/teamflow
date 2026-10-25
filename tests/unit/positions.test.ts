import { describe, expect, it } from "vitest";
import {
  MIN_GAP,
  POSITION_STEP,
  insertionPosition,
  positionAtEnd,
  positionAtStart,
  positionBetween,
  rebalancedPositions,
} from "@/lib/positions";

describe("position helpers", () => {
  it("appends after the last position", () => {
    expect(positionAtEnd(null)).toBe(POSITION_STEP);
    expect(positionAtEnd(2000)).toBe(3000);
  });

  it("prepends before the first position", () => {
    expect(positionAtStart(null)).toBe(0);
    expect(positionAtStart(2000)).toBe(1000);
  });

  it("takes the midpoint between neighbours", () => {
    expect(positionBetween(1000, 2000)).toBe(1500);
    expect(positionBetween(null, null)).toBe(POSITION_STEP);
    expect(positionBetween(null, 3000)).toBe(2000);
    expect(positionBetween(3000, null)).toBe(4000);
  });

  it("returns null when the gap is exhausted (rebalance signal)", () => {
    expect(positionBetween(1000, 1000 + MIN_GAP / 2)).toBeNull();
    expect(positionBetween(1000, 1000 + MIN_GAP * 2)).not.toBeNull();
  });

  it("keeps halving until the gap runs out", () => {
    let before = 0;
    const after = POSITION_STEP;
    let steps = 0;
    let pos = positionBetween(before, after);
    while (pos !== null && steps < 100) {
      before = pos;
      pos = positionBetween(before, after);
      steps++;
    }
    expect(pos).toBeNull();
    expect(steps).toBeGreaterThan(10); // many inserts possible before rebalance
  });

  it("computes insertion positions at list edges and middle", () => {
    const list = [1000, 2000, 3000];
    expect(insertionPosition(list, 0)).toBe(0);
    expect(insertionPosition(list, 1)).toBe(1500);
    expect(insertionPosition(list, 3)).toBe(4000);
    expect(insertionPosition([], 0)).toBe(POSITION_STEP);
  });

  it("rebalances to evenly spaced positions", () => {
    expect(rebalancedPositions(3)).toEqual([1000, 2000, 3000]);
    expect(rebalancedPositions(0)).toEqual([]);
  });
});
