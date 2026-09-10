import { describe, expect, it } from "vitest";
import {
  currentRun,
  endOfCurrentRow,
  indexRows,
  positionOf,
  remainingStitches,
  upcomingRuns,
} from "./knitting-progress";
import { getStitches } from "./stitches";
import { Stitch } from "../types/Stitch";
import { RGB } from "../types/RGB";

const ocean: RGB = [119, 159, 196];
const land: RGB = [178, 200, 169];

const hat = () => getStitches(20, 6, "Hemispherical");

/** Paint a hat so colours change in known runs. */
const painted = (pattern: (id: number) => RGB): Stitch[] =>
  hat().map((stitch) => ({ ...stitch, colour: pattern(stitch.id) }));

describe("indexRows", () => {
  it("assigns every charted stitch to exactly one row", () => {
    const stitches = hat();
    const index = indexRows(stitches);
    const charted = stitches.filter((s) => s.id !== 0);
    const assigned = index.rows.flat();
    expect(new Set(assigned).size).toBe(assigned.length);
    expect(assigned.length).toBe(charted.length);
  });

  it("numbers rows from 1 upwards", () => {
    const index = indexRows(hat());
    expect(index.totalRows).toBeGreaterThan(1);
    const numbers = [...index.rowOf.values()];
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(index.totalRows);
  });

  it("puts the cast-on row first", () => {
    const stitches = hat();
    const index = indexRows(stitches);
    // Stitch 1 is in the cast-on row, which is row 1.
    expect(index.rowOf.get(1)).toBe(1);
  });
});

describe("positionOf", () => {
  it("starts on row 1, stitch 1, with nothing knitted", () => {
    const stitches = hat();
    const position = positionOf(stitches, 0, indexRows(stitches));
    expect(position.row).toBe(1);
    expect(position.stitchInRow).toBe(1);
    expect(position.nextStitchId).toBe(1);
    expect(position.finished).toBe(false);
  });

  it("reports finished at the end", () => {
    const stitches = hat();
    const last = stitches[stitches.length - 1].id;
    const position = positionOf(stitches, last, indexRows(stitches));
    expect(position.finished).toBe(true);
    expect(position.nextStitchId).toBeUndefined();
  });

  it("advances through a row and on to the next", () => {
    const stitches = hat();
    const index = indexRows(stitches);
    const firstRow = index.rows[0];
    const midway = positionOf(stitches, firstRow[2], index);
    expect(midway.row).toBe(1);
    expect(midway.stitchInRow).toBe(4);

    const afterRow = positionOf(stitches, firstRow[firstRow.length - 1], index);
    expect(afterRow.row).toBeGreaterThan(1);
  });

  it("never reports a stitch outside its row", () => {
    const stitches = hat();
    const index = indexRows(stitches);
    for (let p = 0; p < stitches.length - 1; p++) {
      const position = positionOf(stitches, p, index);
      expect(position.stitchInRow).toBeGreaterThanOrEqual(1);
      expect(position.stitchInRow).toBeLessThanOrEqual(position.stitchesInRow);
      expect(position.row).toBeGreaterThanOrEqual(1);
      expect(position.row).toBeLessThanOrEqual(position.totalRows);
    }
  });
});

describe("currentRun", () => {
  it("counts a run of one colour", () => {
    // First ten stitches ocean, then land.
    const stitches = painted((id) => (id <= 10 ? ocean : land));
    const index = indexRows(stitches);
    const run = currentRun(stitches, 0, index);
    expect(run?.colour).toEqual(ocean);
    expect(run?.startId).toBe(1);
    expect(run?.endId).toBe(10);
    expect(run?.length).toBe(10);
  });

  it("stops at a colour change", () => {
    const stitches = painted((id) => (id % 2 === 0 ? ocean : land));
    const run = currentRun(stitches, 0, indexRows(stitches));
    expect(run?.length).toBe(1);
  });

  // A knitter's attention resets at the end of a round, so a run should not
  // silently span two rows even if the colour continues.
  it("does not run past the end of a row", () => {
    const stitches = painted(() => ocean);
    const index = indexRows(stitches);
    const run = currentRun(stitches, 0, index);
    expect(run).toBeDefined();
    expect(index.rowOf.get(run!.endId)).toBe(1);
    expect(run!.endId).toBe(index.rows[0][index.rows[0].length - 1]);
  });

  it("is undefined once there is nothing left to knit", () => {
    const stitches = hat();
    const last = stitches[stitches.length - 1].id;
    expect(currentRun(stitches, last, indexRows(stitches))).toBeUndefined();
  });
});

describe("upcomingRuns", () => {
  it("returns consecutive, non-overlapping runs", () => {
    const stitches = painted((id) => (Math.floor((id - 1) / 4) % 2 === 0 ? ocean : land));
    const index = indexRows(stitches);
    const runs = upcomingRuns(stitches, 0, index, 3);
    expect(runs.length).toBe(3);
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i].startId).toBe(runs[i - 1].endId + 1);
    }
    // Adjacent runs must differ in colour or be split by a row end.
    expect(runs[0].colour).not.toEqual(runs[1].colour);
  });

  it("stops cleanly at the end of the hat", () => {
    const stitches = hat();
    const last = stitches[stitches.length - 1].id;
    expect(upcomingRuns(stitches, last - 1, indexRows(stitches), 5).length).toBeLessThanOrEqual(1);
  });
});

describe("remainingStitches", () => {
  it("counts knittable stitches, excluding the phantom start", () => {
    const stitches = hat();
    const { worked, total, remaining } = remainingStitches(stitches, 0);
    expect(total).toBe(stitches.length - 1);
    expect(worked).toBe(0);
    expect(remaining).toBe(total);
  });

  it("clamps out-of-range progress", () => {
    const stitches = hat();
    expect(remainingStitches(stitches, -5).worked).toBe(0);
    expect(remainingStitches(stitches, 999999).remaining).toBe(0);
  });
});

describe("endOfCurrentRow", () => {
  it("gives the last stitch of the row being worked", () => {
    const stitches = hat();
    const index = indexRows(stitches);
    const firstRow = index.rows[0];
    expect(endOfCurrentRow(0, index)).toBe(firstRow[firstRow.length - 1]);
  });

  it("is undefined at the end of the hat", () => {
    const stitches = hat();
    const last = stitches[stitches.length - 1].id;
    expect(endOfCurrentRow(last, indexRows(stitches))).toBeUndefined();
  });
});
