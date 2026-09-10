import { describe, expect, it } from "vitest";
import { castOnRadius, predictHatShape, settledHeight } from "./hat-shape";
import { getStitches, countCastOnStitches } from "./stitches";
import { adjacentStitchDistance } from "../constants";
import measurements from "./settled-hat-measurements.json";

interface Measurement {
  sts: number;
  bodyRows: number;
  radius: number;
  height: number;
  minY: number;
  crown: "Pyramidal" | "Hemispherical";
}

const measured = measurements as Measurement[];

describe("the recorded measurements", () => {
  it("cover a useful range of hats", () => {
    expect(measured.length).toBeGreaterThanOrEqual(20);
    const stitchCounts = new Set(measured.map((m) => m.sts));
    const rowCounts = new Set(measured.map((m) => m.bodyRows));
    // Both crown shapes, since the fit is used for both.
    expect(new Set(measured.map((m) => m.crown)).size).toBe(2);
    expect(stitchCounts.size).toBeGreaterThanOrEqual(5);
    expect(rowCounts.size).toBeGreaterThanOrEqual(3);
    expect(Math.min(...stitchCounts)).toBeLessThanOrEqual(60);
    expect(Math.max(...stitchCounts)).toBeGreaterThanOrEqual(200);
  });

  it("all sit on the ground, so the hat runs from zero upwards", () => {
    measured.forEach((m) => expect(Math.abs(m.minY)).toBeLessThan(0.2));
  });
});

describe("castOnRadius", () => {
  it("is the cast-on circle, which is analytic", () => {
    for (const stitchesPerRow of [60, 120, 160, 200]) {
      const stitches = getStitches(stitchesPerRow, 20, "Pyramidal");
      const expected =
        (adjacentStitchDistance * countCastOnStitches(stitches)) / (2 * Math.PI);
      expect(castOnRadius(stitches)).toBeCloseTo(expected, 2);
    }
  });

  // Not an estimate: the cast-on row is pinned, so this is what the settled
  // hat actually measures.
  it("matches the radius the settled hats were measured at", () => {
    for (const m of measured) {
      const stitches = getStitches(m.sts, m.bodyRows, m.crown);
      expect(castOnRadius(stitches)).toBeCloseTo(m.radius, 1);
    }
  });
});

describe("predictHatShape", () => {
  /*
   * The fit's accuracy, pinned. If a change to the physics or the shaping moves
   * the real hats, this fails rather than the camera quietly mis-framing them.
   */
  it("predicts every measured hat's height to within 10%", () => {
    const errors = measured.map((m) => {
      const stitches = getStitches(m.sts, m.bodyRows, m.crown);
      const predicted = predictHatShape(stitches).height;
      return {
        sts: m.sts,
        bodyRows: m.bodyRows,
        crown: m.crown,
        error: Math.abs(predicted - m.height) / m.height,
      };
    });

    const worst = errors.reduce((a, b) => (a.error > b.error ? a : b));
    expect(worst.error).toBeLessThan(0.1);

    const mean = errors.reduce((sum, e) => sum + e.error, 0) / errors.length;
    expect(mean).toBeLessThan(0.04);
  });

  /*
   * The two squattest hats in the set are the only ones over 5% out, and they
   * are discs rather than hats. Everything anyone would actually knit is
   * closer, which is what the camera's framing depends on.
   */
  it("predicts a hat anyone would knit to within 5%", () => {
    measured
      .filter((m) => m.bodyRows >= 20)
      .forEach((m) => {
        const predicted = predictHatShape(
          getStitches(m.sts, m.bodyRows, m.crown)
        ).height;
        expect(Math.abs(predicted - m.height) / m.height).toBeLessThan(0.05);
      });
  });

  it("counts the crown's rows, not just the body's", () => {
    const short = predictHatShape(getStitches(120, 20, "Pyramidal"));
    const tall = predictHatShape(getStitches(120, 40, "Pyramidal"));
    expect(tall.rows).toBeGreaterThan(short.rows);
    // 20 body rows plus an 18-row crown is more than 20 rows of chart.
    expect(short.rows).toBeGreaterThan(20);
    expect(tall.height).toBeGreaterThan(short.height);
  });

  /*
   * The fit was derived from pyramidal hats, so this is the check that it is
   * describing the physics rather than that shaping's quirks. The rounded
   * crown takes more rows for the same stitch count, and lands just as close.
   */
  it("is as accurate for the rounded crown as the pyramidal one", () => {
    measured
      .filter((m) => m.crown === "Hemispherical")
      .forEach((m) => {
        const predicted = predictHatShape(
          getStitches(m.sts, m.bodyRows, m.crown)
        ).height;
        expect(Math.abs(predicted - m.height) / m.height).toBeLessThan(0.05);
      });
  });

  it("returns something usable for an empty hat", () => {
    const shape = predictHatShape([]);
    expect(shape.radius).toBeGreaterThan(0);
    expect(shape.height).toBeGreaterThan(0);
  });
});

describe("settledHeight", () => {
  it("approaches the full fabric length for a long narrow tube", () => {
    // A tube much longer than it is wide barely inflates outwards, so almost
    // all of its fabric goes into height.
    const rows = 400;
    expect(settledHeight(1, rows) / (1.6 * rows)).toBeGreaterThan(0.99);
  });

  it("is shorter for a wider hat with the same fabric", () => {
    expect(settledHeight(50, 50)).toBeLessThan(settledHeight(20, 50));
  });

  it("stays positive for a tube far wider than it is long", () => {
    expect(settledHeight(500, 5)).toBeGreaterThan(0);
    expect(Number.isFinite(settledHeight(500, 5))).toBe(true);
  });

  it("survives nonsense", () => {
    expect(Number.isFinite(settledHeight(0, 0))).toBe(true);
    expect(settledHeight(10, 0)).toBeGreaterThanOrEqual(0);
  });
});
