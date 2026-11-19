import type { Stitch as HatStitch } from "../types/Stitch";
import type { PatternLayout, StitchPosition } from "../helpers/pattern-layout";
import { hatKnitting } from "./hat-knitting";
import { layOutSweater } from "../reading/layout";

/**
 * The chart on paper laid out as it is on screen: every stitch over the
 * stitches it was knitted into, by Sweat Shop's layout (see reading/layout),
 * and its rounds the knitting panel's - so a printed chart and the chart in
 * the app number the same rounds and stand each stitch in the same column.
 *
 * In the shape the print and the downloads were drawn from, by the hat's own
 * stitch ids: rows as offsets up from the cast-on at 0, columns as offsets
 * left from stitch 1 at 0.
 */
export const printLayout = (hat: HatStitch[]): PatternLayout => {
  const knitting = hatKnitting(hat);
  const layout = layOutSweater(knitting.stitches, knitting.rounds, knitting.roundKinds, knitting.roundPieces);
  const positions: Record<number, StitchPosition> = {};
  layout.cells.forEach((cell, id) => {
    const own = knitting.hatIdOf(id);
    if (own === undefined || own === 0) return;
    positions[own] = { row: 1 - cell.row, col: 1 - Math.round(cell.column) };
  });
  return { positions, numRows: layout.rows, numCols: layout.columns };
};
