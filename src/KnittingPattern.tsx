import React, { useMemo } from "react";
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

const LabelRight: React.FC<{
  row: number;
  col: number;
  children: React.ReactNode;
}> = ({ row, col, children }) => (
  <div
    className="grid-label"
    id={`label-row-${row}-col-${col}`}
    style={{
      gridRow: row,
      gridColumn: col,
      backgroundColor: "rgb(20, 20, 20)",
      color: "white",
      textAlign: "right",
      aspectRatio: "1 / 1",
      position: "relative",
      right: 0,
      paddingLeft: "2px",
    }}
  >
    {children}
  </div>
);

const LabelBottom: React.FC<{
  row: number;
  col: number;
  children: React.ReactNode;
}> = ({ row, col, children }) => (
  <div
    className="grid-label"
    id={`label-row-${row}-col-${col}`}
    style={{
      gridRow: row,
      gridColumn: col,
      backgroundColor: "rgb(20, 20, 20)",
      color: "white",
      textAlign: "left",
      aspectRatio: "1 / 1",
      position: "relative",
      bottom: 0,
    }}
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
  isNext?: boolean;
  yarns: YarnChoices;
}> = React.memo(({ stitch, position, numRows, numCols, completed, isNext, yarns }) => (
  <div
    id={`stitch-${stitch.id}-row-${position.row}-col-${position.col}`}
    data-next-stitch={isNext ? "true" : undefined}
    style={{
      gridRow: numRows + position.row,
      gridColumn: numCols + position.col,
      backgroundColor: cssColour(displayYarn(stitch.colour, yarns).colour),
      border: "1px solid black",
      borderLeftWidth: (position.col - 1) % 5 === 0 ? "2px" : "1px",
      borderTopWidth: (position.row - 1) % 5 === 0 ? "2px" : "1px",
      textAlign: "center",
      position: isNext ? "sticky" : "relative",
      opacity: completed ? 0.4 : 1,
      // A ring on the next stitch, drawn over its neighbours so it reads
      // clearly against any yarn colour.
      boxShadow: isNext
        ? "0 0 0 2px #fff, 0 0 0 4px #111, 0 0 8px 3px rgba(255,255,255,0.5)"
        : undefined,
      zIndex: isNext ? 3 : undefined,
    }}
  >
    {stitch.type === "k2tog" && (
      <div
        style={{
          position: "absolute",
          top: "14%",
          left: "15%",
          width: "100%",
          height: "100%",
          borderTop: "1px solid black",
          transform: "rotate(45deg)",
          transformOrigin: "-0.5px 0",
        }}
      />
    )}
    {stitch.type === "k3tog" && (
      <React.Fragment>
        <div
          style={{
            position: "absolute",
            left: "calc(-50% - 0.5px)",
            top: "calc(10%)",
            width: "100%",
            height: "85%",
            borderRight: "1px solid black",
            transformOrigin: "top right",
            transform: "rotate(20deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "calc(-50% - 0.5px)",
            top: "calc(10%)",
            width: "100%",
            height: "80%",
            borderRight: "1px solid black",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "calc(-50% - 0.5px)",
            top: "calc(10%)",
            width: "100%",
            height: "85%",
            borderRight: "1px solid black",
            transformOrigin: "top right",
            transform: "rotate(-20deg)",
          }}
        />
      </React.Fragment>
    )}
  </div>
));

const KnittingPattern: React.FC<KnittingPatternProps> = ({
  stitches,
  progress,
  followProgress = false,
}) => {
  const { yarns } = useYarns();
  const gridRef = React.useRef<HTMLDivElement>(null);
  const nextStitchId = followProgress ? progress + 1 : undefined;

  // Keep the stitch being worked on screen, so the chart follows the knitter
  // rather than having to be hunted for.
  React.useEffect(() => {
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

  const filteredStitches = useMemo(
    () => stitches.filter((stitch) => stitch.id !== 0),
    [stitches]
  );

  const { positions, numRows, numCols } = useMemo(
    () => layOutStitches(filteredStitches),
    [filteredStitches]
  );

  if (numRows === 0 || numCols === 0) {
    return <p>This pattern has no stitches to chart.</p>;
  }

  return (
    <div>
      <div
        id="printable-section"
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateRows: `repeat(${numRows + 1}, ${cellSize}px)`,
          gridTemplateColumns: `repeat(${numCols + 1}, ${cellSize}px)`,
          gap: "0px",
          minHeight: `${(numRows + 2) * cellSize}px`,
          overflowX: "auto",
          overflowY: "hidden",
          marginBottom: "10px",
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
          if ((colIndex + 1) % 5 !== 0) return null;
          return (
            <LabelBottom
              key={`col-label-${colIndex}`}
              row={numRows + 1}
              col={numCols - colIndex}
            >
              {colIndex + 1}
            </LabelBottom>
          );
        })}
        {[...Array(numRows)].map((_, rowIndex) => {
          if ((rowIndex + 1) % 5 !== 0) return null;
          return (
            <LabelRight
              key={`row-label-${rowIndex}`}
              col={numCols + 1}
              row={numRows - rowIndex}
            >
              {rowIndex + 1}
            </LabelRight>
          );
        })}
      </div>
    </div>
  );
};

export default KnittingPattern;
