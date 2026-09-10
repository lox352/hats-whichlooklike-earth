import { describe, expect, it } from "vitest";
import {
  instructionsToText,
  rowToText,
  writtenInstructions,
} from "./written-instructions";
import { getStitches } from "./stitches";
import { indexRows } from "./knitting-progress";
import { Stitch } from "../types/Stitch";
import { RGB } from "../types/RGB";

const ocean: RGB = [119, 159, 196];
const land: RGB = [178, 200, 169];
const name = (colour: RGB) => (colour === ocean ? "ocean" : "land");
const nameByValue = (colour: RGB) =>
  colour.join(",") === ocean.join(",") ? "ocean" : "land";

const hat = () => getStitches(20, 6, "Hemispherical");

describe("writtenInstructions", () => {
  it("produces one entry per chart row", () => {
    const stitches = hat();
    const index = indexRows(stitches);
    const rows = writtenInstructions(stitches, index);
    expect(rows).toHaveLength(index.totalRows);
    expect(rows[0].row).toBe(1);
    expect(rows[rows.length - 1].row).toBe(index.totalRows);
  });

  // The stitch counts in the prose have to agree with the chart, or the two
  // instruments contradict each other.
  it("counts the same stitches per row as the chart layout", () => {
    const stitches = hat();
    const index = indexRows(stitches);
    writtenInstructions(stitches, index).forEach((row) => {
      expect(row.stitches).toBe(index.rows[row.row - 1].length);
    });
  });

  it("accounts for every charted stitch exactly once", () => {
    const stitches = hat();
    const rows = writtenInstructions(stitches);
    const written = rows.reduce((total, row) => total + row.stitches, 0);
    expect(written).toBe(stitches.filter((s) => s.id !== 0).length);
  });

  it("merges a run of plain knits in one colour", () => {
    const stitches: Stitch[] = hat().map((stitch) => ({
      ...stitch,
      colour: ocean,
    }));
    const rows = writtenInstructions(stitches);
    const firstRow = rows[0];
    // All one colour and all k1, so the row collapses to a single instruction.
    expect(firstRow.segments).toHaveLength(1);
    expect(firstRow.segments[0].text).toBe(`k${firstRow.stitches}`);
  });

  it("breaks a run at a colour change", () => {
    const stitches: Stitch[] = hat().map((stitch) => ({
      ...stitch,
      colour: stitch.id <= 10 ? ocean : land,
    }));
    const rows = writtenInstructions(stitches);
    expect(rows[0].segments.length).toBeGreaterThan(1);
    expect(rows[0].segments[0].colour).toEqual(ocean);
  });

  it("never merges a decrease into a knit run", () => {
    const stitches = hat();
    const rows = writtenInstructions(stitches);
    const decreaseSegments = rows
      .flatMap((row) => row.segments)
      .filter((segment) => segment.text.includes("tog"));
    expect(decreaseSegments.length).toBeGreaterThan(0);
    decreaseSegments.forEach((segment) => expect(segment.count).toBe(1));
  });

  it("handles an empty pattern", () => {
    expect(writtenInstructions([])).toEqual([]);
  });
});

describe("rowToText", () => {
  it("reads as an instruction", () => {
    const stitches: Stitch[] = hat().map((stitch) => ({
      ...stitch,
      colour: ocean,
    }));
    const line = rowToText(writtenInstructions(stitches)[0], nameByValue);
    expect(line).toMatch(/^Row 1 \(\d+ sts\): k\d+ ocean$/);
  });
});

describe("instructionsToText", () => {
  it("gives one line per row", () => {
    const stitches = hat();
    const text = instructionsToText(stitches, nameByValue);
    const lines = text.split("\n");
    expect(lines).toHaveLength(indexRows(stitches).totalRows);
    lines.forEach((line, i) => expect(line.startsWith(`Row ${i + 1} `)).toBe(true));
  });

  it("is not empty for a real hat", () => {
    expect(instructionsToText(hat(), name).length).toBeGreaterThan(50);
  });
});
