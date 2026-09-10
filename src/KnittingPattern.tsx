import React, { useEffect, useMemo, useRef } from "react";
import { Stitch } from "./types/Stitch";
import { layOutStitches, StitchPosition } from "./helpers/pattern-layout";
import "./KnittingPattern.css";
import { useYarns } from "./useYarns";
import { cssColour, displayYarn, YarnChoices } from "./helpers/yarn-preference";

interface KnittingPatternProps {
  stitches: Stitch[];
  progress: number;
  /** Mark the next stitch to work and keep it in view. */
  followProgress?: boolean;
}

const cellSize = 10;
/** Every nth grid line is drawn heavier, to make counting easier. */
const emphasisEvery = 5;

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
  ({ stitch, position, numRows, numCols, completed, isNext, yarns }) => (
    <div
      className={[
        "chart-cell",
        /*
         * The heavy lines fall *after* every fifth stitch and row, counting
         * from the bottom right as you knit.
         *
         * A cell carries its own right and bottom borders, and stitch number
         * n sits at col 1 - n (so stitch 1 is col 0, and numbers grow
         * leftwards). The line between stitch 5 and stitch 6 is therefore the
         * right-hand border of stitch 6, which is col -5. Marking col -5,
         * -10, -15 puts the line after each fifth stitch; marking stitch 5
         * itself, as this used to, put it between 4 and 5.
         */
        position.col !== 0 && position.col % emphasisEvery === 0
          ? "chart-cell-major-col"
          : "",
        position.row !== 0 && position.row % emphasisEvery === 0
          ? "chart-cell-major-row"
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
      {stitch.type === "k2tog" && (
        <div className="chart-mark chart-mark-k2tog" />
      )}
      {stitch.type === "k3tog" && (
        <>
          <div className="chart-mark chart-mark-k3tog-a" />
          <div className="chart-mark chart-mark-k3tog-b" />
          <div className="chart-mark chart-mark-k3tog-c" />
        </>
      )}
    </div>
  )
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

  // Keep the stitch being worked on screen, so the chart follows the knitter
  // rather than having to be hunted for.
  useEffect(() => {
    if (nextStitchId === undefined) return;
    const grid = gridRef.current;
    const cell = grid?.querySelector<HTMLElement>('[data-next-stitch="true"]');
    if (!grid || !cell) return;
    const target =
      cell.offsetLeft - grid.clientWidth / 2 + cell.offsetWidth / 2;
    grid.scrollTo({
      left: Math.max(target, 0),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [nextStitchId]);

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
