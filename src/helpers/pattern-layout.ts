import { Stitch } from "../types/Stitch";

export interface StitchPosition {
  row: number;
  col: number;
}

export interface PatternLayout {
  positions: { [id: number]: StitchPosition };
  numRows: number;
  numCols: number;
}

/**
 * Lay the knitted tube out flat as a chart.
 *
 * Each stitch is anchored one row above the middle of the stitches it was
 * knitted into, in the same column. Stitches with no row below run leftwards
 * along the cast-on row.
 *
 * Rows are negative offsets counting upward from the cast-on row at 0, and
 * columns are negative offsets counting leftward from 0; `numRows`/`numCols`
 * convert those into 1-based CSS grid lines.
 *
 * Note the knitting is a helix, not a stack of closed rings, so a decrease
 * near the seam can consume stitches from two different chart rows.
 */
export const layOutStitches = (stitches: Stitch[]): PatternLayout => {
  const positions: { [id: number]: StitchPosition } = {};

  stitches.forEach((stitch, index) => {
    if (index === 0) {
      positions[stitch.id] = { row: 0, col: 0 };
      return;
    }

    const linksToConsider = stitch.links.filter((id) => id !== 0).slice(0, -1);

    if (linksToConsider.length === 0) {
      const linkedStitchPos = positions[stitch.links[stitch.links.length - 1]];
      // A link we have not placed yet would corrupt the whole layout, so skip
      // the stitch rather than propagating NaN through the grid.
      if (!linkedStitchPos) return;
      positions[stitch.id] = {
        row: linkedStitchPos.row,
        col: linkedStitchPos.col - 1,
      };
      return;
    }

    const middleIndex = Math.floor(linksToConsider.length / 2);
    const middleLinkPos = positions[linksToConsider[middleIndex]];
    if (!middleLinkPos) return;
    positions[stitch.id] = {
      row: middleLinkPos.row - 1,
      col: middleLinkPos.col,
    };
  });

  const placed = Object.values(positions);
  if (placed.length === 0) {
    return { positions, numRows: 0, numCols: 0 };
  }

  const { minRow, minCol } = placed.reduce(
    (acc, pos) => ({
      minRow: Math.min(acc.minRow, pos.row),
      minCol: Math.min(acc.minCol, pos.col),
    }),
    { minRow: Infinity, minCol: Infinity }
  );

  return { positions, numRows: 1 - minRow, numCols: 1 - minCol };
};
