import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SavedPattern as Pattern } from "../types/SavedPattern";
import KnittingPattern from "../KnittingPattern";
import KnittingMode from "./KnittingMode";
import ChartActions from "./ChartActions";
import ChartPrintSheet from "./ChartPrintSheet";
import YarnChoicesEditor from "./YarnChoices";
import WrittenInstructions from "./WrittenInstructions";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import ProgressRing from "./ProgressRing";
import FinishedBanner from "./FinishedBanner";
import {
  patternsChangedEvent,
  percentComplete,
  readPattern,
  setProgress,
  knittableStitchCount,
} from "../helpers/pattern-storage";
import { useYarns } from "../useYarns";

const SavedPattern: React.FC = () => {
  const { patternId } = useParams();
  const navigate = useNavigate();
  const { yarns, setYarns } = useYarns();

  const [recordingProgress, setRecordingProgress] = useState(false);
  /*
   * Miscounting is the normal failure mode when knitting, so every change is
   * pushed onto a stack that can be walked back. Kept in memory only: it is
   * for the session you are knitting in, not something to persist.
   */
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [savedPattern, setSavedPattern] = useState<Pattern | undefined>(() =>
    readPattern(patternId)
  );

  const refresh = useCallback(
    () => setSavedPattern(readPattern(patternId)),
    [patternId]
  );

  useEffect(() => {
    refresh();
    window.addEventListener(patternsChangedEvent, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(patternsChangedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const commitProgress = (next: number) => {
    if (!savedPattern) return;
    if (next === savedPattern.progress) return;
    setUndoStack((stack) => [...stack.slice(-199), savedPattern.progress]);
    setProgress(savedPattern.id, next);
  };

  const undo = () => {
    if (!savedPattern) return;
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const previous = stack[stack.length - 1];
      setProgress(savedPattern.id, previous);
      return stack.slice(0, -1);
    });
  };

  if (!savedPattern) {
    return (
      <PageLayout title="Pattern not found">
        <p>
          This pattern is no longer saved in this browser. Saved patterns live
          only on the device that made them.
        </p>
        <Button variant="primary" onClick={() => navigate("/")}>
          Back to your hats
        </Button>
      </PageLayout>
    );
  }

  const percent = percentComplete(savedPattern);
  const name = savedPattern.name ?? "Saved Pattern";
  const finished = percent >= 100;

  return (
    <PageLayout title={name} step="pattern">
      {finished && (
        <FinishedBanner stitches={knittableStitchCount(savedPattern)} />
      )}
      <div className="screen-only">
        <KnittingPattern
          stitches={savedPattern.stitches}
          progress={savedPattern.progress}
          followProgress={recordingProgress}
        />
      </div>
      <ChartPrintSheet stitches={savedPattern.stitches} title={name} />
      <YarnChoicesEditor yarns={yarns} setYarns={setYarns} />

      {!recordingProgress && (
        <div className="render-actions screen-only">
          {finished ? (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate("/design")}
              >
                Knit another
              </Button>
              <Button
                variant="quiet"
                onClick={() => setRecordingProgress(true)}
              >
                Adjust the count
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setRecordingProgress(true)}
            >
              {percent > 0 ? "Keep knitting" : "Start knitting"}
            </Button>
          )}
          <Button variant="quiet" onClick={() => navigate("/")}>
            Back to your hats
          </Button>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--ink-faint)",
              fontSize: "var(--text-sm)",
            }}
          >
            <ProgressRing
              percent={percent}
              label={`${percent.toFixed(0)}% knitted`}
            />
            {percent.toFixed(1)}% knitted
          </span>
        </div>
      )}

      {/* Taking the chart away matters less than getting on with it, so it
          sits at the bottom. */}
      <div className="chart-extras screen-only">
        <WrittenInstructions stitches={savedPattern.stitches} />
        <ChartActions stitches={savedPattern.stitches} name={name} />
      </div>

      {recordingProgress && (
        <KnittingMode
          stitches={savedPattern.stitches}
          progress={savedPattern.progress}
          setProgress={commitProgress}
          onStop={() => setRecordingProgress(false)}
          canUndo={undoStack.length > 0}
          onUndo={undo}
        />
      )}
    </PageLayout>
  );
};

export default SavedPattern;
