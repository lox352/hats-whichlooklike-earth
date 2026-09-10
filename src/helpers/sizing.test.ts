import { describe, expect, it } from "vitest";
import {
  bodyHeightFor,
  bodyRowsForHeight,
  circumferenceFor,
  crownRowsFor,
  hatHeightFromArc,
  totalHeightFor,
  totalRowsFor,
  defaultOverTheTop,
  defaultGauge,
  defaultHeadCircumference,
  headFittedBy,
  isValidGauge,
  negativeEase,
  rowsFor,
  stitchesPerRowFor,
} from "./sizing";
import { pyramidalBase, validateDesign } from "../types/KnittingMachine";
import {
  defaultNumberOfRows,
  defaultStitchesPerRow,
} from "../constants";
import { getStitches } from "./stitches";
import { indexRows } from "./knitting-progress";

describe("stitchesPerRowFor", () => {
  // The constraint that matters: a pyramidal hat must be a multiple of 10, so
  // sizing must never hand back a count the machine will reject.
  it("always produces a valid pyramidal count", () => {
    for (let head = 30; head <= 70; head += 0.5) {
      for (const stitchesPer10cm of [14, 18, 22, 26, 30, 34]) {
        const count = stitchesPerRowFor(
          head,
          { ...defaultGauge, stitchesPer10cm },
          "Pyramidal"
        );
        expect(count % (pyramidalBase * 2)).toBe(0);
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  it("produces counts the design validator accepts", () => {
    for (let head = 42; head <= 68; head += 2) {
      const count = stitchesPerRowFor(head, defaultGauge, "Pyramidal");
      const problems = validateDesign(count, 35, "Pyramidal");
      expect(problems.map((p) => p.field)).not.toContain("stitchesPerRow");
    }
  });

  it("produces an even count for the hemispherical decrease", () => {
    for (let head = 40; head <= 66; head += 1) {
      const count = stitchesPerRowFor(head, defaultGauge, "Hemispherical");
      expect(count % 2).toBe(0);
    }
  });

  it("gives roughly the site's own default for a typical head", () => {
    // 56cm head, 22 sts/10cm, 10% ease -> 110 stitches. The site's stock 160
    // corresponds to a chunkier gauge, which is why the gauge is an input.
    expect(stitchesPerRowFor(56, { ...defaultGauge, stitchesPer10cm: 22 }, "Pyramidal")).toBe(110);
    expect(stitchesPerRowFor(56, { ...defaultGauge, stitchesPer10cm: 32 }, "Pyramidal")).toBe(160);
  });

  it("gets bigger for a bigger head", () => {
    const small = stitchesPerRowFor(48, defaultGauge, "Pyramidal");
    const large = stitchesPerRowFor(62, defaultGauge, "Pyramidal");
    expect(large).toBeGreaterThan(small);
  });

  it("never returns zero, even for nonsense", () => {
    expect(stitchesPerRowFor(0, defaultGauge, "Pyramidal")).toBe(
      pyramidalBase * 2
    );
    expect(stitchesPerRowFor(-10, defaultGauge, "Pyramidal")).toBe(
      pyramidalBase * 2
    );
  });
});

describe("round tripping", () => {
  /*
   * The tolerance is the rounding, not a fudge. A pyramidal count moves in
   * steps of ten stitches, so the finished hat can land up to half a step
   * either side of the size asked for: at 23 stitches per 10cm that is a
   * little over 2cm. The design page reports what you actually get, rather
   * than pretending the request was met exactly.
   */
  const halfStep = (gauge: typeof defaultGauge) =>
    (pyramidalBase * 2) / 2 / (gauge.stitchesPer10cm / 10);

  it("circumference and stitch count agree, within the rounding", () => {
    const count = stitchesPerRowFor(56, defaultGauge, "Pyramidal");
    const circumference = circumferenceFor(count, defaultGauge);
    expect(Math.abs(circumference - 56 * negativeEase)).toBeLessThanOrEqual(
      halfStep(defaultGauge) + 0.001
    );
  });

  it("reports the head a count actually fits, within the rounding", () => {
    const count = stitchesPerRowFor(56, defaultGauge, "Pyramidal");
    expect(Math.abs(headFittedBy(count, defaultGauge) - 56)).toBeLessThanOrEqual(
      halfStep(defaultGauge) / negativeEase + 0.001
    );
  });

  it("rows and body height agree", () => {
    expect(rowsFor(bodyHeightFor(35, defaultGauge), defaultGauge)).toBe(35);
  });

  it("uses the default head and gauge consistently", () => {
    const count = stitchesPerRowFor(
      defaultHeadCircumference,
      defaultGauge,
      "Pyramidal"
    );
    expect(count).toBeGreaterThan(60);
    expect(count).toBeLessThan(200);
  });
});

describe("isValidGauge", () => {
  it.each([
    [{ stitchesPer10cm: 22, rowsPer10cm: 30 }, true],
    [{ stitchesPer10cm: 0, rowsPer10cm: 30 }, false],
    [{ stitchesPer10cm: 22, rowsPer10cm: 0 }, false],
    [{ stitchesPer10cm: -5, rowsPer10cm: 30 }, false],
    [{ stitchesPer10cm: NaN, rowsPer10cm: 30 }, false],
    [{ stitchesPer10cm: 22, rowsPer10cm: Infinity }, false],
  ])("%o -> %s", (gauge, expected) => {
    expect(isValidGauge(gauge)).toBe(expected);
  });
});

/**
 * The design page's defaults and the sizing calculator have to agree.
 *
 * They did not: the page opened with 160 stitches, no realistic gauge produces
 * 160, and so pressing "work out my stitches" on an untouched page silently
 * rewrote it as 110.
 */
describe("defaults agree with each other", () => {
  it("working out the stitches from the defaults changes nothing", () => {
    const stitches = stitchesPerRowFor(
      defaultHeadCircumference,
      defaultGauge,
      "Pyramidal"
    );
    expect(stitches).toBe(defaultStitchesPerRow);
    expect(
      bodyRowsForHeight(
        hatHeightFromArc(defaultOverTheTop),
        stitches,
        defaultGauge,
        "Pyramidal"
      )
    ).toBe(defaultNumberOfRows);
  });

  it("the default gauge is a plausible hand-knitting gauge", () => {
    // Double-knit wool territory: roughly 20-26 stitches over 10cm.
    expect(defaultGauge.stitchesPer10cm).toBeGreaterThanOrEqual(18);
    expect(defaultGauge.stitchesPer10cm).toBeLessThanOrEqual(28);
    expect(defaultGauge.rowsPer10cm).toBeGreaterThanOrEqual(20);
    expect(defaultGauge.rowsPer10cm).toBeLessThanOrEqual(36);
  });

  it("the default hat is a plausible adult beanie", () => {
    const around = circumferenceFor(defaultStitchesPerRow, defaultGauge);
    expect(around).toBeGreaterThan(44);
    expect(around).toBeLessThan(60);
    // Brim edge to crown, the way a beanie is specified. Adult patterns sit
    // in the 18-24cm band.
    const height = totalHeightFor(
      defaultStitchesPerRow,
      defaultNumberOfRows,
      defaultGauge,
      "Pyramidal"
    );
    expect(height).toBeGreaterThan(17);
    expect(height).toBeLessThan(25);
  });

  it("the default stitch count is valid for both crown shapes", () => {
    expect(
      validateDesign(defaultStitchesPerRow, defaultNumberOfRows, "Pyramidal")
    ).toEqual([]);
    expect(
      validateDesign(defaultStitchesPerRow, defaultNumberOfRows, "Hemispherical")
    ).toEqual([]);
  });
});

/**
 * The crown's own height, which the old sizing ignored entirely: it asked how
 * tall the straight section should be and left the crown to add whatever it
 * added on top.
 */
describe("crownRowsFor", () => {
  it("does not depend on how long the body is", () => {
    // This is what makes it measurable once and reusable. If the shaping ever
    // starts reading the body length, this fails.
    for (const method of ["Pyramidal", "Hemispherical"] as const) {
      for (const stitches of [60, 120, 160]) {
        const rows = [10, 20, 35, 50].map(
          (body) =>
            totalRowsFor(stitches, body, method) - body
        );
        expect(new Set(rows).size).toBe(1);
        expect(rows[0]).toBe(crownRowsFor(stitches, method));
      }
    }
  });

  it("matches the rows the knitting machine actually produces", () => {
    for (const method of ["Pyramidal", "Hemispherical"] as const) {
      for (const stitches of [40, 80, 120, 200]) {
        const body = 12;
        const measured =
          indexRows(getStitches(stitches, body, method)).totalRows - body;
        expect(crownRowsFor(stitches, method)).toBe(measured);
      }
    }
  });

  it("grows with the stitch count", () => {
    const small = crownRowsFor(60, "Pyramidal");
    const large = crownRowsFor(200, "Pyramidal");
    expect(large).toBeGreaterThan(small);
    expect(small).toBeGreaterThan(0);
  });

  it("returns zero rather than throwing for a count the shaping rejects", () => {
    // 63 is not divisible by ten, so a pyramidal crown cannot be worked.
    expect(crownRowsFor(63, "Pyramidal")).toBe(0);
  });
});

describe("sizing by finished height", () => {
  it("halves the arc over the head", () => {
    expect(hatHeightFromArc(38)).toBe(19);
    expect(hatHeightFromArc(0)).toBe(0);
    expect(hatHeightFromArc(-5)).toBe(0);
  });

  it("lands within a row of the height asked for", () => {
    const gauge = defaultGauge;
    const rowHeight = 10 / gauge.rowsPer10cm;
    for (const wanted of [16, 18, 19, 21, 24, 28]) {
      for (const stitches of [80, 120, 160]) {
        const body = bodyRowsForHeight(wanted, stitches, gauge, "Pyramidal");
        const actual = totalHeightFor(stitches, body, gauge, "Pyramidal");
        expect(Math.abs(actual - wanted)).toBeLessThanOrEqual(rowHeight + 0.001);
      }
    }
  });

  it("accounts for the crown, so the body is shorter than the whole hat", () => {
    const gauge = defaultGauge;
    const stitches = 120;
    const body = bodyRowsForHeight(19, stitches, gauge, "Pyramidal");
    expect(bodyHeightFor(body, gauge)).toBeLessThan(19);
    expect(body).toBeLessThan(totalRowsFor(stitches, body, "Pyramidal"));
  });

  // A hat asked to be shorter than its own crown still has to knit.
  it("never asks for fewer rows than the machine accepts", () => {
    for (const wanted of [0, 1, 3, 5]) {
      for (const stitches of [80, 160, 240]) {
        const body = bodyRowsForHeight(wanted, stitches, defaultGauge, "Pyramidal");
        expect(validateDesign(stitches, body, "Pyramidal")).toEqual([]);
      }
    }
  });

  it("a taller hat means more body rows", () => {
    const short = bodyRowsForHeight(17, 120, defaultGauge, "Pyramidal");
    const tall = bodyRowsForHeight(26, 120, defaultGauge, "Pyramidal");
    expect(tall).toBeGreaterThan(short);
  });
});
