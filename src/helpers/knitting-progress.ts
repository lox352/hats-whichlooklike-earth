import { Stitch } from "../types/Stitch";
import { layOutStitches } from "./pattern-layout";
import { RGB } from "../types/RGB";

/**
 * Where you are in a pattern, and what to knit next.
 *
 * Progress is the id of the last stitch worked, so the next stitch to knit is
 * the one after it. A percentage is not much use with needles in your hands;
 * what you need is the row, the stitch within it, and how many of the current
 * colour to work before changing.
 */

export interface KnittingPosition {
  /** 1-based row, counting up from the cast-on. */
  row: number;
  totalRows: number;
  /** 1-based stitch within the row. */
  stitchInRow: number;
  stitchesInRow: number;
  /** Id of the next stitch to work, or undefined when the hat is finished. */
  nextStitchId: number | undefined;
  finished: boolean;
}

export interface ColourRun {
  colour: RGB;
  /** Number of consecutive stitches of this colour. */
  length: number;
  /** Id of the first stitch in the run. */
  startId: number;
  /** Id of the last stitch in the run. */
  endId: number;
}

const sameColour = (a: RGB, b: RGB) =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export interface RowIndex {
  /** Row number, 1-based, for each stitch id. */
  rowOf: Map<number, number>;
  /** Stitch ids in each row, in the order they are knitted. */
  rows: number[][];
  totalRows: number;
}

/**
 * Group stitches into rows using the chart layout, so the row numbers a
 * knitter is told match the row numbers printed on the chart.
 */
export const indexRows = (stitches: Stitch[]): RowIndex => {
  const charted = stitches.filter((stitch) => stitch.id !== 0);
  const { positions, numRows } = layOutStitches(charted);

  const rowOf = new Map<number, number>();
  const rows: number[][] = Array.from({ length: numRows }, () => []);

  charted.forEach((stitch) => {
    const position = positions[stitch.id];
    if (!position) return;
    /*
     * Chart rows are offsets from the cast-on, which sits at 0, with later
     * rows counting downwards into negatives. Knitters number rows from the
     * cast-on upwards, so row 1 is offset 0.
     *
     * Note this is not the same arithmetic the chart uses for CSS grid lines
     * (numRows + row), because a grid puts row 1 at the top while the cast-on
     * belongs at the bottom.
     */
    const row = 1 - position.row;
    if (row < 1 || row > numRows) return;
    rowOf.set(stitch.id, row);
    rows[row - 1].push(stitch.id);
  });

  rows.forEach((row) => row.sort((a, b) => a - b));

  return { rowOf, rows, totalRows: numRows };
};

export const positionOf = (
  stitches: Stitch[],
  progress: number,
  index: RowIndex
): KnittingPosition => {
  const lastId = stitches.length > 0 ? stitches[stitches.length - 1].id : 0;
  const nextStitchId = progress >= lastId ? undefined : progress + 1;
  const finished = nextStitchId === undefined;

  const referenceId = nextStitchId ?? progress;
  const row = index.rowOf.get(referenceId) ?? 1;
  const idsInRow = index.rows[row - 1] ?? [];
  const stitchInRow = Math.max(idsInRow.indexOf(referenceId) + 1, 1);

  return {
    row,
    totalRows: index.totalRows,
    stitchInRow,
    stitchesInRow: idsInRow.length,
    nextStitchId,
    finished,
  };
};

/**
 * The run of same-coloured stitches starting at the next stitch to knit.
 *
 * This is the instruction that matters in colourwork: work this many in this
 * colour, then change. Runs stop at the end of a row, because that is where a
 * knitter's attention resets.
 */
export const currentRun = (
  stitches: Stitch[],
  progress: number,
  index: RowIndex
): ColourRun | undefined => {
  const startId = progress + 1;
  const byId = new Map(stitches.map((stitch) => [stitch.id, stitch]));
  const first = byId.get(startId);
  if (!first) return undefined;

  const row = index.rowOf.get(startId);
  let endId = startId;

  for (let id = startId + 1; ; id++) {
    const candidate = byId.get(id);
    if (!candidate) break;
    if (!sameColour(candidate.colour, first.colour)) break;
    if (index.rowOf.get(id) !== row) break;
    endId = id;
  }

  return {
    colour: first.colour,
    length: endId - startId + 1,
    startId,
    endId,
  };
};

/** The next few colour runs, for a look-ahead. */
export const upcomingRuns = (
  stitches: Stitch[],
  progress: number,
  index: RowIndex,
  count = 3
): ColourRun[] => {
  const runs: ColourRun[] = [];
  let at = progress;
  for (let i = 0; i < count; i++) {
    const run = currentRun(stitches, at, index);
    if (!run) break;
    runs.push(run);
    at = run.endId;
  }
  return runs;
};

/** Stitches remaining, and how many have been worked. */
export const remainingStitches = (
  stitches: Stitch[],
  progress: number
): { worked: number; total: number; remaining: number } => {
  const total = Math.max(stitches.length - 1, 0);
  const worked = Math.min(Math.max(progress, 0), total);
  return { worked, total, remaining: total - worked };
};

/** Id of the last stitch of the row containing `progress + 1`. */
export const endOfCurrentRow = (
  progress: number,
  index: RowIndex
): number | undefined => {
  const row = index.rowOf.get(progress + 1);
  if (row === undefined) return undefined;
  const ids = index.rows[row - 1];
  if (!ids || ids.length === 0) return undefined;
  return ids[ids.length - 1];
};
