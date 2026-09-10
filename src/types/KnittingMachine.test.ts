import { describe, expect, it } from "vitest";
import KnittingMachine, {
  minimumNumberOfRows,
  minimumStitchesPerRow,
  pyramidalBase,
  validateDesign,
} from "./KnittingMachine";
import {
  getStitches,
  generateCircle,
  countCastOnStitches,
} from "../helpers/stitches";
import { Stitch } from "./Stitch";

describe("validateDesign", () => {
  it("accepts the defaults the design page ships with", () => {
    expect(validateDesign(160, 35, "Pyramidal")).toEqual([]);
  });

  it("rejects a pyramidal stitch count that is not divisible by the base", () => {
    const problems = validateDesign(163, 35, "Pyramidal");
    expect(problems).toHaveLength(1);
    expect(problems[0].field).toBe("stitchesPerRow");
    // The message should name a count that actually works.
    const suggested = Number(problems[0].message.match(/Try (\d+)/)?.[1]);
    expect(suggested % (pyramidalBase * 2)).toBe(0);
  });

  it("allows the same count under the hemispherical decrease", () => {
    expect(validateDesign(163, 35, "Hemispherical")).toEqual([]);
  });

  it.each([0, -10, 1, minimumStitchesPerRow - 1, 12.5])(
    "rejects %s stitches per row",
    (stitchesPerRow) => {
      const problems = validateDesign(stitchesPerRow, 35, "Hemispherical");
      expect(problems.map((p) => p.field)).toContain("stitchesPerRow");
    }
  );

  it.each([0, -1, minimumNumberOfRows - 1, 2.5])(
    "rejects %s rows",
    (numberOfRows) => {
      const problems = validateDesign(160, numberOfRows, "Pyramidal");
      expect(problems.map((p) => p.field)).toContain("numberOfRows");
    }
  );

  it("reports both fields at once when both are wrong", () => {
    const problems = validateDesign(0, 0, "Pyramidal");
    expect(problems.map((p) => p.field).sort()).toEqual([
      "numberOfRows",
      "stitchesPerRow",
    ]);
  });
});

describe("KnittingMachine", () => {
  const stitchesPerRow = 40;

  const build = (decrease: "Hemispherical" | "Pyramidal") =>
    getStitches(stitchesPerRow, 8, decrease);

  it.each(["Hemispherical", "Pyramidal"] as const)(
    "%s: ids are dense and start at zero",
    (decrease) => {
      const stitches = build(decrease);
      expect(stitches.length).toBeGreaterThan(stitchesPerRow);
      stitches.forEach((stitch, index) => expect(stitch.id).toBe(index));
    }
  );

  it.each(["Hemispherical", "Pyramidal"] as const)(
    "%s: every link points at an earlier stitch",
    (decrease) => {
      const stitches = build(decrease);
      const offenders = stitches.flatMap((stitch) =>
        stitch.links
          .filter((link) => link >= stitch.id || link < 0)
          .map((link) => `${stitch.id} -> ${link}`)
      );
      expect(offenders).toEqual([]);
    }
  );

  it.each(["Hemispherical", "Pyramidal"] as const)(
    "%s: every link resolves to a real stitch",
    (decrease) => {
      const stitches = build(decrease);
      const ids = new Set(stitches.map((s) => s.id));
      const dangling = stitches.flatMap((stitch) =>
        stitch.links.filter((link) => !ids.has(link))
      );
      expect(dangling).toEqual([]);
    }
  );

  it("casts on exactly one row, then closes the round with a join", () => {
    const stitches = build("Pyramidal");

    // Stitches 0..stitchesPerRow-1 are the cast-on row.
    const castOn = stitches.slice(0, stitchesPerRow);
    expect(castOn.every((stitch) => stitch.fixed)).toBe(true);
    expect(castOn.every((stitch) => stitch.type === "k1")).toBe(true);

    // The join closes the round and is also fixed, but it is not part of the
    // row. It sits immediately after the cast-on, not at the end of the hat.
    expect(stitches[stitchesPerRow].type).toBe("join");
    expect(stitches[stitchesPerRow].fixed).toBe(true);

    // Nothing after the join is fixed.
    expect(
      stitches.slice(stitchesPerRow + 1).some((stitch) => stitch.fixed)
    ).toBe(false);
  });

  it("countCastOnStitches counts the row without the join", () => {
    const stitches = build("Pyramidal");
    expect(countCastOnStitches(stitches)).toBe(stitchesPerRow);
    // The naive counts that this function exists to avoid.
    expect(stitches.filter((s) => s.fixed).length).toBe(stitchesPerRow + 1);
    expect(stitches.findIndex((s) => !s.fixed)).toBe(stitchesPerRow + 1);
  });

  it("decreases to a narrow final row", () => {
    const stitches = build("Pyramidal");
    const finalStitch = stitches[stitches.length - 1];
    const finalRowWidth =
      finalStitch.id - stitches[finalStitch.links[0]].id;
    expect(finalRowWidth).toBeLessThan(stitchesPerRow / 2);
    expect(finalRowWidth).toBeGreaterThan(0);
  });

  it("throws when the pyramidal base does not divide the stitch count", () => {
    const machine = new KnittingMachine(43);
    machine.castOnRow(generateCircle(43)).join();
    machine.knitRow(["k1"]);
    expect(() => machine.decreasePyramidically(pyramidalBase)).toThrow(
      /divisible by 10/
    );
  });

  it("is deterministic: the same design produces the same stitches", () => {
    const summarise = (stitches: Stitch[]) =>
      stitches.map((s) => `${s.id}:${s.type}:${s.links.join("|")}`).join(",");
    expect(summarise(build("Hemispherical"))).toBe(
      summarise(build("Hemispherical"))
    );
  });
});
