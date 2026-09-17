import {
  RegionDescription,
  RegionKind,
  regionDescriptions,
} from "../data/region-names";
import { Stitch } from "../types/Stitch";
import { StitchPosition } from "./pattern-layout";

/*
 * What to say about a place once a stitch has told you it is there: what it
 * is called, what sort of place it is, and how much of this hat is in it.
 * The chart caption, the knitting panel, the index and the printed legend all
 * read from here, so they cannot end up describing the same place two ways.
 */

export interface Region extends RegionDescription {
  key: string;
}

/**
 * Everything known about a region, or nothing for a stitch that has no label
 * and for a label from some later version of the data.
 */
export const regionInfo = (key: string | undefined): Region | undefined => {
  if (key === undefined) return undefined;
  const description = regionDescriptions[key];
  return description ? { key, ...description } : undefined;
};

/** Whether this hat was charted with labels at all. */
export const hasRegions = (stitches: Stitch[]): boolean =>
  stitches.some((stitch) => stitch.id > 0 && stitch.region !== undefined);

export interface RegionCount {
  key: string;
  name: string;
  kind: RegionKind;
  /** Knitted stitches of this hat that landed in the region. */
  stitches: number;
}

/**
 * How much of the hat each region gets, in name order.
 *
 * Name order rather than size order, because a stitch count is not a measure
 * of a place here: below its equator the hat is a cylinder, which stretches
 * the far south across many more stitches than its share of the globe. It is
 * an index, so it reads as one.
 */
export const regionCounts = (stitches: Stitch[]): RegionCount[] => {
  const counts = new Map<string, RegionCount>();
  for (const stitch of stitches) {
    if (stitch.id <= 0 || stitch.region === undefined) continue;
    const found = counts.get(stitch.region);
    if (found) {
      found.stitches += 1;
      continue;
    }
    const description = regionDescriptions[stitch.region];
    counts.set(stitch.region, {
      key: stitch.region,
      name: description?.name ?? stitch.region,
      kind: description?.kind ?? "country",
      stitches: 1,
    });
  }
  return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * The region the next stitch is in: the one you are knitting into.
 *
 * `progress` is the id of the last stitch worked, and ids are array indices,
 * so the answer is simply the stitch after it - and nothing once the hat is
 * finished, or when the hat carries no labels.
 */
export const currentRegion = (
  stitches: Stitch[],
  progress: number
): string | undefined => stitches[progress + 1]?.region;

/**
 * The outline of one region on the chart, as an SVG path in chart pixels.
 *
 * Only the cell edges where the region meets a different one, or the edge of
 * the fabric: the edges it shares with itself are left out, so a region reads
 * as one shape rather than a grid of squares. The chart seam cuts it, as the
 * seam cuts everything - and an ocean that goes all the way round the hat is
 * outlined down both edges of the chart, which is honest, because it does.
 */
export const regionOutline = (
  stitches: Stitch[],
  positions: Record<number, StitchPosition>,
  numRows: number,
  numCols: number,
  cellSize: number,
  key: string
): string => {
  const at = new Map<string, string | undefined>();
  for (const stitch of stitches) {
    const position = positions[stitch.id];
    if (position) at.set(`${position.row},${position.col}`, stitch.region);
  }

  const edges: string[] = [];
  for (const stitch of stitches) {
    if (stitch.region !== key) continue;
    const position = positions[stitch.id];
    if (!position) continue;
    const { row, col } = position;
    const x = (numCols + col - 1) * cellSize;
    const y = (numRows + row - 1) * cellSize;
    const other = (r: number, c: number) => at.get(`${r},${c}`) !== key;
    if (other(row - 1, col)) edges.push(`M${x},${y}h${cellSize}`);
    if (other(row + 1, col)) edges.push(`M${x},${y + cellSize}h${cellSize}`);
    if (other(row, col - 1)) edges.push(`M${x},${y}v${cellSize}`);
    if (other(row, col + 1)) edges.push(`M${x + cellSize},${y}v${cellSize}`);
  }
  return edges.join("");
};
