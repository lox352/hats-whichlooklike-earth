import { describe, expect, it } from "vitest";
import {
  currentRegion,
  hasRegions,
  regionCounts,
  regionInfo,
  regionOutline,
} from "./region-guide";
import { layOutStitches, StitchPosition } from "./pattern-layout";
import { Stitch } from "../types/Stitch";
import { getStitches } from "./stitches";

const stitch = (id: number, region?: string): Stitch => ({
  id,
  position: { x: id, y: 0, z: 0 },
  links: id === 0 ? [] : [id - 1],
  fixed: id === 0,
  type: "k1",
  colour: [1, 2, 3],
  region,
});

describe("regionInfo", () => {
  it("describes a country and a stretch of water", () => {
    expect(regionInfo("FRA")).toEqual({
      key: "FRA",
      name: "France",
      where: "in Western Europe",
      kind: "country",
    });
    expect(regionInfo("coral-sea")).toEqual({
      key: "coral-sea",
      name: "Coral Sea",
      where: "a sea",
      kind: "sea",
    });
  });

  it("says nothing about a stitch with no label, or a label it cannot place", () => {
    expect(regionInfo(undefined)).toBeUndefined();
    expect(regionInfo("ATLANTIS")).toBeUndefined();
  });

  /*
   * Antarctica's subregion in the source data is Antarctica, which would read
   * as "Antarctica, in Antarctica". An empty note is better than a silly one,
   * so every reader has to cope with one.
   */
  it("leaves the note empty rather than repeating the name", () => {
    expect(regionInfo("ATA")?.name).toBe("Antarctica");
    expect(regionInfo("ATA")?.where).toBe("");
  });
});

describe("hasRegions", () => {
  it("is true for a labelled hat and false for one charted before labels", () => {
    expect(hasRegions([stitch(0), stitch(1, "FRA")])).toBe(true);
    expect(hasRegions([stitch(0), stitch(1)])).toBe(false);
  });

  it("ignores the phantom stitch at the start of the helix", () => {
    expect(hasRegions([stitch(0, "FRA"), stitch(1)])).toBe(false);
  });
});

describe("regionCounts", () => {
  const hat = [
    stitch(0, "FRA"),
    stitch(1, "FRA"),
    stitch(2, "north-atlantic-ocean"),
    stitch(3, "FRA"),
    stitch(4, "ESP"),
    stitch(5),
  ];

  it("counts the knitted stitches of each region, in name order", () => {
    expect(regionCounts(hat)).toEqual([
      { key: "FRA", name: "France", kind: "country", stitches: 2 },
      {
        key: "north-atlantic-ocean",
        name: "North Atlantic Ocean",
        kind: "ocean",
        stitches: 1,
      },
      { key: "ESP", name: "Spain", kind: "country", stitches: 1 },
    ]);
  });

  it("skips the phantom stitch and any stitch with no label", () => {
    const total = regionCounts(hat).reduce((sum, c) => sum + c.stitches, 0);
    expect(total).toBe(4);
  });

  it("has nothing to say about a hat charted before labels", () => {
    expect(regionCounts([stitch(0), stitch(1), stitch(2)])).toEqual([]);
  });
});

describe("currentRegion", () => {
  const hat = [stitch(0), stitch(1, "FRA"), stitch(2, "ESP")];

  it("names the region of the stitch about to be worked", () => {
    expect(currentRegion(hat, 0)).toBe("FRA");
    expect(currentRegion(hat, 1)).toBe("ESP");
  });

  it("says nothing once the hat is finished", () => {
    expect(currentRegion(hat, 2)).toBeUndefined();
    expect(currentRegion(hat, 99)).toBeUndefined();
  });

  it("says nothing about a hat charted before labels", () => {
    expect(currentRegion([stitch(0), stitch(1)], 0)).toBeUndefined();
  });
});

describe("regionOutline", () => {
  /*
   * A block of four cells in a row, the middle two in one region. The edge
   * they share is inside the region and must not be drawn, or the region
   * reads as a row of boxes rather than one shape.
   */
  const positions: Record<number, StitchPosition> = {
    1: { row: 0, col: -3 },
    2: { row: 0, col: -2 },
    3: { row: 0, col: -1 },
    4: { row: 0, col: 0 },
  };
  const row = [
    stitch(1, "ESP"),
    stitch(2, "FRA"),
    stitch(3, "FRA"),
    stitch(4, "ESP"),
  ];

  it("leaves out the edge two cells of the region share", () => {
    const path = regionOutline(row, positions, 1, 4, 10, "FRA");
    // The boundary between cells 2 and 3 is the vertical at x = 20.
    expect(path).not.toContain("M20,0v10");
    // The boundaries with Spain on either side are drawn.
    expect(path).toContain("M10,0v10");
    expect(path).toContain("M30,0v10");
  });

  it("closes the region against the edge of the fabric", () => {
    const path = regionOutline(row, positions, 1, 4, 10, "FRA");
    expect(path).toContain("M10,0h10");
    expect(path).toContain("M10,10h10");
  });

  it("draws nothing for a region that is not on the hat", () => {
    expect(regionOutline(row, positions, 1, 4, 10, "JPN")).toBe("");
  });

  it("draws nothing for a hat charted before labels", () => {
    const bare: Stitch[] = row.map((stitch) => ({ ...stitch, region: undefined }));
    expect(regionOutline(bare, positions, 1, 4, 10, "FRA")).toBe("");
  });

  it("outlines a region of a real chart without falling over", () => {
    const hat = getStitches(20, 6, "Pyramidal").map((stitch) => ({
      ...stitch,
      region: stitch.id % 3 === 0 ? "FRA" : "ESP",
    }));
    const { positions: laid, numRows, numCols } = layOutStitches(hat);
    const path = regionOutline(hat, laid, numRows, numCols, 10, "FRA");
    expect(path.length).toBeGreaterThan(0);
    expect(path.startsWith("M")).toBe(true);
  });
});
