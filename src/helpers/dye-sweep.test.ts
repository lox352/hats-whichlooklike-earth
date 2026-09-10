import { describe, expect, it } from "vitest";
import {
  dyeAmount,
  dyeFadeWindow,
  dyeOrderFromHeights,
  heightsOf,
} from "./dye-sweep";

describe("dyeOrderFromHeights", () => {
  it("dyes the crown first and the rim last", () => {
    // Heights ascending, so the last entry is the highest.
    const order = dyeOrderFromHeights([0, 5, 10]);
    expect(order[2]).toBe(0);
    expect(order[0]).toBeGreaterThan(order[1]);
    expect(order[1]).toBeGreaterThan(order[2]);
  });

  it("leaves every stitch room to finish inside the sweep", () => {
    const order = dyeOrderFromHeights([0, 1, 2, 3, 4, 5]);
    order.forEach((offset) => {
      expect(offset).toBeGreaterThanOrEqual(0);
      // The last stitch to start must still complete by progress 1.
      expect(offset + dyeFadeWindow).toBeLessThanOrEqual(1.0000001);
    });
  });

  it("handles a flat hat without dividing by zero", () => {
    const order = dyeOrderFromHeights([4, 4, 4]);
    expect([...order]).toEqual([0, 0, 0]);
  });

  it("handles no stitches", () => {
    expect(dyeOrderFromHeights([])).toHaveLength(0);
  });

  it("ignores non-finite heights rather than poisoning the range", () => {
    const order = dyeOrderFromHeights([0, NaN, 10]);
    expect(Number.isFinite(order[0])).toBe(true);
    expect(Number.isFinite(order[1])).toBe(true);
    expect(Number.isFinite(order[2])).toBe(true);
    expect(order[2]).toBe(0);
  });
});

describe("dyeAmount", () => {
  it("is nothing before a stitch's turn and everything after", () => {
    expect(dyeAmount(0, 0.5)).toBe(0);
    expect(dyeAmount(0.5, 0.5)).toBe(0);
    expect(dyeAmount(0.5 + dyeFadeWindow, 0.5)).toBe(1);
    expect(dyeAmount(1, 0.5)).toBe(1);
  });

  it("eases rather than stepping", () => {
    const half = dyeAmount(0.5 + dyeFadeWindow / 2, 0.5);
    expect(half).toBeGreaterThan(0.4);
    expect(half).toBeLessThan(0.6);
    // Smoothstep: flat at both ends.
    expect(dyeAmount(0.5 + dyeFadeWindow * 0.05, 0.5)).toBeLessThan(0.02);
    expect(dyeAmount(0.5 + dyeFadeWindow * 0.95, 0.5)).toBeGreaterThan(0.98);
  });

  it("never leaves the 0..1 range", () => {
    for (let progress = -0.5; progress <= 1.5; progress += 0.05) {
      for (const offset of [0, 0.3, 0.8]) {
        const amount = dyeAmount(progress, offset);
        expect(amount).toBeGreaterThanOrEqual(0);
        expect(amount).toBeLessThanOrEqual(1);
      }
    }
  });

  it("survives nonsense", () => {
    expect(dyeAmount(NaN, 0)).toBe(0);
    expect(dyeAmount(0.5, NaN)).toBe(0);
  });

  // The whole hat must be dyed by the time the sweep reports finished, or
  // stitches would be left pale when the button appears.
  it("has every stitch fully dyed at progress 1", () => {
    const order = dyeOrderFromHeights([0, 2, 4, 6, 8, 10]);
    order.forEach((offset) => expect(dyeAmount(1, offset)).toBe(1));
  });
});

describe("heightsOf", () => {
  it("reads y, treating a missing position as the ground", () => {
    expect(
      heightsOf([{ x: 0, y: 3, z: 0 }, undefined, { x: 0, y: 7, z: 0 }])
    ).toEqual([3, 0, 7]);
  });
});
