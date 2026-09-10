import React, { useEffect, useMemo, useRef } from "react";
import { Stitch } from "./types/Stitch";
import { layOutStitches, StitchPosition } from "./helpers/pattern-layout";
import "./KnittingPattern.css";
import { useYarns } from "./useYarns";
import { cssColour, displayYarn, YarnChoices } from "./helpers/yarn-preference";
import { stitchMarkPath } from "./helpers/stitch-marks";

interface KnittingPatternProps {
  stitches: Stitch[];
  progress: number;
  /** Mark the next stitch to work and keep it in view. */
  followProgress?: boolean;
}

const cellSize = 10;
/** Every nth grid line is drawn heavier, to make counting easier. */
const emphasisEvery = 5;

/**
 * How far above the knitting panel the stitch being worked should sit, in rows.
 *
 * Enough that the row you are on and the few you have just finished are all
 * clear of the panel, rather than the stitch you want hugging its top edge.
 */
const rowsAbovePanel = 5;

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Label: React.FC<{
  row: number;
  col: number;
  edge: "right" | "bottom";
  children: React.ReactNode;
}> = ({ row, col, edge, children }) => (
  <div
    className={`chart-label chart-label-${edge}`}
    style={{ gridRow: row, gridColumn: col }}
  >
    {children}
  </div>
);

const StitchBox: React.FC<{
  stitch: Stitch;
  position: StitchPosition;
  numRows: number;
  numCols: number;
  completed: boolean;
  isNext: boolean;
  yarns: YarnChoices;
}> = React.memo(
  ({ stitch, position, numRows, numCols, completed, isNext, yarns }) => {
    const mark = stitchMarkPath(stitch.type, 0, 0, cellSize);
    return (
      <div
        className={[
          "chart-cell",
          /*
           * The heavy lines fall *after* every fifth stitch and row, counting
           * from the bottom right as you knit.
           *
           * Stitch number n sits at col 1 - n, so stitch 1 is col 0 and the
           * numbers grow leftwards. The line between stitch 5 and stitch 6 is
           * therefore the right-hand edge of stitch 6, which is col -5.
           * Marking col -5, -10, -15 puts the line after each fifth stitch;
           * marking stitch 5 itself, as this used to, put it between 4 and 5.
           *
           * Both cells along a line get a class, because each contributes
           * half its thickness: stitch 6 darkens its right edge, and stitch
           * 5, at col -4, darkens its left. Rows work the same way, upwards.
           */
          position.col !== 0 && position.col % emphasisEvery === 0
            ? "chart-cell-major-right"
            : "",
          position.col !== -1 && (position.col + 1) % emphasisEvery === 0
            ? "chart-cell-major-left"
            : "",
          position.row !== 0 && position.row % emphasisEvery === 0
            ? "chart-cell-major-bottom"
            : "",
          position.row !== -1 && (position.row + 1) % emphasisEvery === 0
            ? "chart-cell-major-top"
            : "",
          completed ? "chart-cell-done" : "",
          isNext ? "chart-cell-next" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-next-stitch={isNext ? "true" : undefined}
        style={{
          gridRow: numRows + position.row,
          gridColumn: numCols + position.col,
          backgroundColor: cssColour(displayYarn(stitch.colour, yarns).colour),
        }}
      >
        {mark && (
          <svg
            className="chart-mark"
            viewBox={`0 0 ${cellSize} ${cellSize}`}
            aria-hidden="true"
          >
            <path d={mark} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>
    );
  }
);

const KnittingPattern: React.FC<KnittingPatternProps> = ({
  stitches,
  progress,
  followProgress = false,
}) => {
  const { yarns } = useYarns();
  const gridRef = useRef<HTMLDivElement>(null);
  const nextStitchId = followProgress ? progress + 1 : undefined;

  const filteredStitches = useMemo(
    () => stitches.filter((stitch) => stitch.id !== 0),
    [stitches]
  );

  const { positions, numRows, numCols } = useMemo(
    () => layOutStitches(filteredStitches),
    [filteredStitches]
  );

  // Sideways, within the chart: keep the stitch being worked in the middle, so
  // the chart follows the knitter rather than having to be hunted for.
  useEffect(() => {
    if (nextStitchId === undefined) return;
    const grid = gridRef.current;
    const cell = grid?.querySelector<HTMLElement>('[data-next-stitch="true"]');
    if (!grid || !cell) return;
    const target =
      cell.offsetLeft - grid.clientWidth / 2 + cell.offsetWidth / 2;
    grid.scrollTo({
      left: Math.max(target, 0),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [nextStitchId]);

  /*
   * And down the page: keep that stitch clear of the knitting panel.
   *
   * Only when the row changes. Within a row the stitch moves sideways, which
   * the effect above handles, and scrolling the page on every stitch would
   * have the whole chart twitching once per stitch.
   */
  const nextRow =
    nextStitchId === undefined ? undefined : positions[nextStitchId]?.row;

  useEffect(() => {
    if (nextRow === undefined) return;
    const cell = gridRef.current?.querySelector<HTMLElement>(
      '[data-next-stitch="true"]'
    );
    if (!cell) return;
    /*
     * The panel is stuck to the bottom of the screen while you knit, so the
     * part of the page you can actually see ends at its top edge rather than
     * at the bottom of the window.
     *
     * Its height, not wherever it happens to be sitting: it is sticky, so at
     * the very bottom of the page it comes unstuck and rides higher than it
     * will once the page has scrolled. Aiming at that moving line settled
     * the stitch six rows off.
     */
    const panel = document.querySelector<HTMLElement>(".knitting-panel");
    const floor = window.innerHeight - (panel?.offsetHeight ?? 0);
    const wanted = floor - rowsAbovePanel * cellSize;
    const delta = cell.getBoundingClientRect().bottom - wanted;
    if (Math.abs(delta) < 1) return;
    window.scrollBy({
      top: delta,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [nextRow]);

  if (numRows === 0 || numCols === 0) {
    return <p>This pattern has no stitches to chart.</p>;
  }

  return (
    <div>
      <div
        id="printable-section"
        className="chart"
        ref={gridRef}
        style={{
          gridTemplateRows: `repeat(${numRows + 1}, ${cellSize}px)`,
          gridTemplateColumns: `repeat(${numCols + 1}, ${cellSize}px)`,
          minHeight: `${(numRows + 2) * cellSize}px`,
        }}
      >
        {filteredStitches.map((stitch) => {
          const position = positions[stitch.id];
          if (!position) return null;
          return (
            <StitchBox
              key={`box-${stitch.id}`}
              stitch={stitch}
              position={position}
              numRows={numRows}
              numCols={numCols}
              completed={stitch.id <= progress}
              isNext={stitch.id === nextStitchId}
              yarns={yarns}
            />
          );
        })}
        {[...Array(numCols)].map((_, colIndex) => {
          if ((colIndex + 1) % emphasisEvery !== 0) return null;
          return (
            <Label
              key={`col-label-${colIndex}`}
              edge="bottom"
              row={numRows + 1}
              col={numCols - colIndex}
            >
              {colIndex + 1}
            </Label>
          );
        })}
        {[...Array(numRows)].map((_, rowIndex) => {
          if ((rowIndex + 1) % emphasisEvery !== 0) return null;
          return (
            <Label
              key={`row-label-${rowIndex}`}
              edge="right"
              col={numCols + 1}
              row={numRows - rowIndex}
            >
              {rowIndex + 1}
            </Label>
          );
        })}
      </div>
      <p className="chart-caption">
        {numCols} stitches across, {numRows} rows. Read from the bottom right,
        working right to left. Scroll sideways to see the whole round.
      </p>
    </div>
  );
};

export default KnittingPattern;
