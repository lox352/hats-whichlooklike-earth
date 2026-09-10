import React, { useCallback, useEffect, useMemo } from "react";
import { Stitch } from "../types/Stitch";
import { RGB } from "../types/RGB";
import {
  currentRun,
  endOfCurrentRow,
  indexRows,
  positionOf,
  remainingStitches,
  upcomingRuns,
} from "../helpers/knitting-progress";
import "./KnittingMode.css";
import { useYarns } from "../useYarns";
import { cssColour, displayYarn } from "../helpers/yarn-preference";

interface KnittingModeProps {
  stitches: Stitch[];
  progress: number;
  /** Absolute progress, already clamped by the caller. */
  setProgress: (progress: number) => void;
  onStop: () => void;
  canUndo: boolean;
  onUndo: () => void;
}

/**
 * The view you use while actually knitting.
 *
 * Designed for someone holding needles: the things it puts in large type are
 * the row, the stitch within the row, and how many of the current colour to
 * work before changing. A percentage is not actionable, so it is demoted to a
 * bar.
 *
 * The two big buttons are the two things you actually do: work one more
 * stitch, or work to the end of the current colour run. The second is the one
 * that saves real effort in colourwork, where you work a stretch of one colour
 * and then change.
 */
const KnittingMode: React.FC<KnittingModeProps> = ({
  stitches,
  progress,
  setProgress,
  onStop,
  canUndo,
  onUndo,
}) => {
  const { yarns } = useYarns();
  const yarnName = (colour: RGB) => displayYarn(colour, yarns).name;
  const swatch = (colour: RGB) => cssColour(displayYarn(colour, yarns).colour);

  const index = useMemo(() => indexRows(stitches), [stitches]);
  const position = useMemo(
    () => positionOf(stitches, progress, index),
    [stitches, progress, index]
  );
  const run = useMemo(
    () => currentRun(stitches, progress, index),
    [stitches, progress, index]
  );
  const ahead = useMemo(
    () => upcomingRuns(stitches, run?.endId ?? progress, index, 2),
    [stitches, run, progress, index]
  );
  const counts = useMemo(
    () => remainingStitches(stitches, progress),
    [stitches, progress]
  );

  const percent = counts.total === 0 ? 0 : (100 * counts.worked) / counts.total;

  const step = useCallback(
    (delta: number) => setProgress(progress + delta),
    [progress, setProgress]
  );

  const finishRun = useCallback(() => {
    if (run) setProgress(run.endId);
  }, [run, setProgress]);

  const finishRow = useCallback(() => {
    const end = endOfCurrentRow(progress, index);
    if (end !== undefined) setProgress(end);
  }, [progress, index, setProgress]);

  // Keyboard shortcuts: your hands are busy, so the common actions need to be
  // reachable without aiming at anything.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        onUndo();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case " ":
        case "ArrowRight":
          event.preventDefault();
          step(1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          step(-1);
          break;
        case "Enter":
          event.preventDefault();
          finishRun();
          break;
        case "u":
        case "U":
          event.preventDefault();
          onUndo();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, finishRun, onUndo]);

  return (
    <div className="knitting-panel screen-only">
      <div className="knitting-progress-bar">
        <div
          className="knitting-progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Row, stitch and what is left, on one line rather than three blocks. */}
      <div className="knitting-where">
        <span>
          <span className="knitting-label">Row</span>
          <b>{position.row}</b>
          <span> / {position.totalRows}</span>
        </span>
        <span>
          <span className="knitting-label">Stitch</span>
          <b>{position.stitchInRow}</b>
          <span> / {position.stitchesInRow}</span>
        </span>
        <span>
          <span className="knitting-label">Left</span>
          <b>{counts.remaining}</b>
        </span>
      </div>

      {position.finished ? (
        <p className="knitting-finished" aria-live="polite">
          That is the whole planet knitted. Every stitch accounted for.
        </p>
      ) : (
        <>
          <div className="knitting-run" aria-live="polite">
            {run && (
              <>
                <span
                  className="knitting-swatch"
                  style={{ backgroundColor: swatch(run.colour) }}
                />
                <span className="knitting-run-text">
                  Knit <b>{run.length}</b> in {yarnName(run.colour)}
                </span>
              </>
            )}
          </div>

          {ahead.length > 0 && (
            <div className="knitting-upcoming">
              <span>then</span>
              {ahead.map((next) => (
                <span key={next.startId}>
                  <span
                    className="knitting-upcoming-swatch"
                    style={{ backgroundColor: swatch(next.colour) }}
                  />
                  {next.length} {yarnName(next.colour)}
                </span>
              ))}
            </div>
          )}

          <div className="knitting-primary">
            <button
              type="button"
              className="knitting-button knitting-button-primary"
              onClick={() => step(1)}
            >
              Knit one
              <span className="knitting-keys">space</span>
            </button>
            <button
              type="button"
              className="knitting-button knitting-button-run"
              onClick={finishRun}
              disabled={!run}
            >
              {run ? `Done all ${run.length}` : "Done the run"}
              <span className="knitting-keys">enter</span>
            </button>
          </div>
        </>
      )}

      <div className="knitting-secondary">
        <button
          type="button"
          className="knitting-button"
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="knitting-button"
          onClick={() => step(-1)}
          disabled={progress <= 0}
        >
          Back one
        </button>
        <button
          type="button"
          className="knitting-button"
          onClick={finishRow}
          disabled={position.finished}
        >
          End of row
        </button>
        <button type="button" className="knitting-button" onClick={onStop}>
          Stop
        </button>
      </div>

      <p className="knitting-hint">
        Space knits one, enter finishes the colour run, arrows step, Ctrl+Z or U
        undoes. Progress saves as you go.
      </p>
    </div>
  );
};

export default KnittingMode;
