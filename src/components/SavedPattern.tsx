import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SavedPattern as Pattern } from "../types/SavedPattern";
import KnittingPattern from "../KnittingPattern";
import KnittingMode from "./KnittingMode";
import ChartActions from "./ChartActions";
import ChartPrintSheet from "./ChartPrintSheet";
import YarnChoicesEditor from "./YarnChoices";
import WrittenInstructions from "./WrittenInstructions";
import {
  patternsChangedEvent,
  percentComplete,
  readPattern,
  setProgress,
} from "../helpers/pattern-storage";
import { useYarns } from "../useYarns";

const SavedPattern: React.FC = () => {
  const { patternId } = useParams();
  const navigate = useNavigate();

  const { yarns, setYarns } = useYarns();
  const [recordingProgress, setRecordingProgress] = React.useState(false);
  /*
   * Miscounting is the normal failure mode when knitting, so every change is
   * pushed onto a stack that can be walked back. Kept in memory only: it is
   * for the session you are knitting in, not something to persist.
   */
  const [undoStack, setUndoStack] = React.useState<number[]>([]);
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
      <div style={{ textAlign: "left", padding: "20px" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
          Pattern not found
        </h1>
        <p>
          This pattern is no longer saved in this browser. Saved patterns live
          only on the device that made them.
        </p>
        <button
          style={{
            backgroundColor: "#3f51b5",
            color: "white",
            padding: "10px 15px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          Back to Homepage
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1
        className="screen-only"
        style={{ fontSize: "2.5rem", marginBottom: "20px" }}
      >
        {savedPattern.name ?? "Saved Pattern"}
      </h1>

      <div className="screen-only">
        <KnittingPattern
          stitches={savedPattern.stitches}
          progress={savedPattern.progress}
          followProgress={recordingProgress}
        />
      </div>
      <ChartPrintSheet
        stitches={savedPattern.stitches}
        title={savedPattern.name ?? "Saved Pattern"}
      />
      <ChartActions
        stitches={savedPattern.stitches}
        name={savedPattern.name ?? "saved-pattern"}
      />
      <YarnChoicesEditor yarns={yarns} setYarns={setYarns} />
      <WrittenInstructions stitches={savedPattern.stitches} />
      {!recordingProgress && (
        <div className="screen-only" style={{ textAlign: "right" }}>
          <button
            style={{
              backgroundColor: "#f44336",
              color: "white",
              padding: "10px 15px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "10px",
              marginBottom: "10px",
              marginRight: "10px",
            }}
            onClick={() => navigate("/")}
          >
            Back to Homepage
          </button>
          <button
            style={{
              backgroundColor: "#3f51b5",
              color: "white",
              padding: "10px 15px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "10px",
              marginBottom: "10px",
            }}
            onClick={() => {
              setRecordingProgress(true);
            }}
          >
            Start Knitting
          </button>
          <div style={{ textAlign: "left" }}>
            {percentComplete(savedPattern).toFixed(2)}% complete
          </div>
        </div>
      )}
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
    </div>
  );
};

export default SavedPattern;
