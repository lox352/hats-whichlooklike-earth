import { describe, expect, it } from "vitest";
import {
  bodyHeightFor,
  circumferenceFor,
  defaultGauge,
  defaultHeadCircumference,
  headFittedBy,
  isValidGauge,
  negativeEase,
  rowsFor,
  stitchesPerRowFor,
} from "./sizing";
import { pyramidalBase, validateDesign } from "../types/KnittingMachine";

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
  it("circumference and stitch count agree", () => {
    const count = stitchesPerRowFor(56, defaultGauge, "Pyramidal");
    const circumference = circumferenceFor(count, defaultGauge);
    // Within the rounding to a multiple of 10 stitches.
    expect(circumference).toBeCloseTo(56 * negativeEase, 0);
  });

  it("reports the head a count actually fits", () => {
    const count = stitchesPerRowFor(56, defaultGauge, "Pyramidal");
    expect(headFittedBy(count, defaultGauge)).toBeCloseTo(56, 0);
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
