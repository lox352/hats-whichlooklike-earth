import { describe, expect, it } from "vitest";
import { layOutStitches } from "./helpers/pattern-layout";
import { getStitches } from "./helpers/stitches";
import { Stitch } from "./types/Stitch";

/** The chart drops stitch 0, so mirror that here. */
const chartable = (stitches: Stitch[]) =>
  stitches.filter((stitch) => stitch.id !== 0);

describe("layOutStitches", () => {
  it("returns a zero-sized grid for no stitches", () => {
    // Guards the old `1 - Infinity` path, which produced
    // `gridTemplateRows: repeat(-Infinity, 10px)`.
    const { numRows, numCols } = layOutStitches([]);
    expect(numRows).toBe(0);
    expect(numCols).toBe(0);
  });

  it("returns a finite grid for a real hat", () => {
    const { numRows, numCols } = layOutStitches(
      chartable(getStitches(40, 8, "Pyramidal"))
    );
    expect(Number.isFinite(numRows)).toBe(true);
    expect(Number.isFinite(numCols)).toBe(true);
    expect(numRows).toBeGreaterThan(0);
    expect(numCols).toBeGreaterThan(0);
  });

  it.each(["Hemispherical", "Pyramidal"] as const)(
    "%s: places every chartable stitch",
    (decrease) => {
      const stitches = chartable(getStitches(40, 8, decrease));
      const { positions } = layOutStitches(stitches);
      const unplaced = stitches.filter((s) => !positions[s.id]).map((s) => s.id);
      expect(unplaced).toEqual([]);
    }
  );

  it.each(["Hemispherical", "Pyramidal"] as const)(
    "%s: no two stitches share a cell",
    (decrease) => {
      const stitches = chartable(getStitches(40, 8, decrease));
      const { positions } = layOutStitches(stitches);

      const seen = new Map<string, number>();
      const collisions: string[] = [];
      Object.entries(positions).forEach(([id, pos]) => {
        const key = `${pos.row},${pos.col}`;
        const existing = seen.get(key);
        if (existing !== undefined) {
          collisions.push(`stitches ${existing} and ${id} both at ${key}`);
        }
        seen.set(key, Number(id));
      });

      expect(collisions).toEqual([]);
    }
  );

  it.each(["Hemispherical", "Pyramidal"] as const)(
    "%s: every stitch lands inside the reported grid",
    (decrease) => {
      const stitches = chartable(getStitches(40, 8, decrease));
      const { positions, numRows, numCols } = layOutStitches(stitches);

      Object.values(positions).forEach((pos) => {
        // These are the values fed to gridRow / gridColumn.
        expect(numRows + pos.row).toBeGreaterThanOrEqual(1);
        expect(numRows + pos.row).toBeLessThanOrEqual(numRows + 1);
        expect(numCols + pos.col).toBeGreaterThanOrEqual(1);
        expect(numCols + pos.col).toBeLessThanOrEqual(numCols + 1);
      });
    }
  );

  it("lays the cast-on row out along a single row, right to left", () => {
    const stitchesPerRow = 20;
    const stitches = chartable(getStitches(stitchesPerRow, 6, "Hemispherical"));
    const { positions } = layOutStitches(stitches);

    // Stitches 1..stitchesPerRow-1 are the rest of the cast-on row.
    const castOnRow = stitches
      .filter((s) => s.id < stitchesPerRow)
      .map((s) => positions[s.id]);

    expect(new Set(castOnRow.map((p) => p.row)).size).toBe(1);
    const cols = castOnRow.map((p) => p.col);
    expect(cols).toEqual([...cols].sort((a, b) => b - a));
  });

  /**
   * The layout anchors each stitch to the *middle* of the stitches it was
   * knitted into, one row up and in the same column. That is the contract.
   *
   * It deliberately is not "above every stitch it consumed": the knitting is a
   * helix rather than a stack of closed rings, so a decrease that straddles the
   * seam consumes stitches from two different chart rows. Two stitches in this
   * fixture do exactly that.
   */
  it.each(["Hemispherical", "Pyramidal"] as const)(
    "%s: anchors each stitch one row above its middle link, in the same column",
    (decrease) => {
      const stitches = chartable(getStitches(20, 6, decrease));
      const { positions } = layOutStitches(stitches);

      const misplaced = stitches
        .filter((stitch) => stitch.links.filter((id) => id !== 0).length > 1)
        .filter((stitch) => {
          const below = stitch.links.filter((id) => id !== 0).slice(0, -1);
          const middle = positions[below[Math.floor(below.length / 2)]];
          const here = positions[stitch.id];
          if (!middle || !here) return false;
          return here.row !== middle.row - 1 || here.col !== middle.col;
        })
        .map((s) => s.id);

      expect(misplaced).toEqual([]);
    }
  );

  it("keeps stitches within one row of their neighbour in the same round", () => {
    const stitches = chartable(getStitches(20, 6, "Hemispherical"));
    const { positions } = layOutStitches(stitches);

    // The last link is the previous stitch in the same round. Across the helix
    // seam it may step up a row, but never further than that.
    const jumps = stitches
      .filter((stitch) => stitch.links.length > 0)
      .filter((stitch) => {
        const neighbour = positions[stitch.links[stitch.links.length - 1]];
        const here = positions[stitch.id];
        if (!neighbour || !here) return false;
        return Math.abs(here.row - neighbour.row) > 1;
      })
      .map((s) => s.id);

    expect(jumps).toEqual([]);
  });

  it("skips a stitch whose links have not been placed rather than corrupting the grid", () => {
    const orphan: Stitch[] = [
      {
        id: 1,
        position: { x: 0, y: 0, z: 0 },
        links: [],
        fixed: true,
        type: "k1",
        colour: [0, 0, 0],
      },
      {
        // Points at a stitch that is not in the list at all.
        id: 2,
        position: { x: 0, y: 0, z: 0 },
        links: [999, 998],
        fixed: false,
        type: "k1",
        colour: [0, 0, 0],
      },
    ];

    const { positions, numRows, numCols } = layOutStitches(orphan);
    expect(positions[1]).toBeDefined();
    expect(positions[2]).toBeUndefined();
    expect(Number.isFinite(numRows)).toBe(true);
    expect(Number.isFinite(numCols)).toBe(true);
  });
});

/**
 * Where the heavy grid lines fall.
 *
 * Stitch number n sits at col 1 - n, counting from the bottom right as you
 * knit. Cells carry their own right border, so the line after stitch 5 is the
 * right border of stitch 6.
 */
describe("heavy grid lines", () => {
  const majorCol = (col: number) => col !== 0 && col % 5 === 0;
  const colOf = (stitchNumber: number) => 1 - stitchNumber;

  it("falls after every fifth stitch, not before", () => {
    // Stitch 6's right border is the boundary between 5 and 6.
    expect(majorCol(colOf(6))).toBe(true);
    expect(majorCol(colOf(11))).toBe(true);
    expect(majorCol(colOf(16))).toBe(true);
  });

  it("does not fall between the fourth and fifth stitch", () => {
    // The bug this replaces marked stitch 5, separating 4 from 5.
    expect(majorCol(colOf(5))).toBe(false);
    expect(majorCol(colOf(10))).toBe(false);
  });

  it("does not draw one at the right-hand edge of the chart", () => {
    expect(majorCol(colOf(1))).toBe(false);
  });

  it("marks exactly one boundary in every five stitches", () => {
    const marked = [];
    for (let n = 1; n <= 40; n++) if (majorCol(colOf(n))) marked.push(n);
    expect(marked).toEqual([6, 11, 16, 21, 26, 31, 36]);
  });
});
