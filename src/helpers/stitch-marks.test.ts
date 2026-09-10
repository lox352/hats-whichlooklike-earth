import { describe, expect, it } from "vitest";
import { markStrokeFraction, stitchMarkPath } from "./stitch-marks";

/** Pulls the coordinate pairs out of the path data, in order. */
const pointsIn = (path: string): [number, number][] =>
  path
    .split(/[ML]/)
    .filter((part) => part.trim() !== "")
    .map((part) => {
      const [x, y] = part.trim().split(/\s+/).map(Number);
      return [x, y] as [number, number];
    });

describe("stitchMarkPath", () => {
  it("marks only the decreases", () => {
    expect(stitchMarkPath("k1")).toBeUndefined();
    expect(stitchMarkPath("join")).toBeUndefined();
    expect(stitchMarkPath("k2tog")).toBeDefined();
    expect(stitchMarkPath("k3tog")).toBeDefined();
  });

  /*
   * The bug this file was written for: the screen chart's marks were built out
   * of hand-tuned offsets and sat half a pixel left of centre, with twice as
   * much room above them as below.
   */
  it("centres the k3tog chevron on the middle of the cell", () => {
    const points = pointsIn(stitchMarkPath("k3tog", 0, 0, 10)!);
    expect(points).toHaveLength(3);
    const [left, apex, right] = points;
    expect(apex[0]).toBe(5);
    // The two feet are the same distance out, and level with each other.
    expect(5 - left[0]).toBe(right[0] - 5);
    expect(left[1]).toBe(right[1]);
  });

  it("leaves the same room on every side", () => {
    for (const type of ["k2tog", "k3tog"] as const) {
      const points = pointsIn(stitchMarkPath(type, 0, 0, 10)!);
      const xs = points.map(([x]) => x);
      const ys = points.map(([, y]) => y);
      expect(Math.min(...xs)).toBe(10 - Math.max(...xs));
      expect(Math.min(...ys)).toBe(10 - Math.max(...ys));
    }
  });

  it("stays inside its cell, wherever the cell is", () => {
    for (const type of ["k2tog", "k3tog"] as const) {
      for (const [x, y, size] of [
        [0, 0, 10],
        [70, 130, 10],
        [0, 0, 1],
        [12.5, 7.25, 3.5],
      ]) {
        const points = pointsIn(stitchMarkPath(type, x, y, size)!);
        for (const [px, py] of points) {
          expect(px).toBeGreaterThanOrEqual(x);
          expect(px).toBeLessThanOrEqual(x + size);
          expect(py).toBeGreaterThanOrEqual(y);
          expect(py).toBeLessThanOrEqual(y + size);
        }
      }
    }
  });

  it("scales with the cell, so both charts draw the same shape", () => {
    const small = pointsIn(stitchMarkPath("k3tog", 0, 0, 10)!);
    const large = pointsIn(stitchMarkPath("k3tog", 0, 0, 40)!);
    small.forEach(([x, y], index) => {
      expect(large[index][0]).toBeCloseTo(x * 4, 6);
      expect(large[index][1]).toBeCloseTo(y * 4, 6);
    });
  });

  it("draws a one pixel line in a ten pixel cell", () => {
    expect(10 * markStrokeFraction).toBe(1);
  });
});
