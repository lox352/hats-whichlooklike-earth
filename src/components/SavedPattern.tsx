import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SavedPattern as Pattern } from "../types/SavedPattern";
import KnittingPattern from "../KnittingPattern";
import {
  patternsChangedEvent,
  percentComplete,
  readPattern,
  setProgress,
} from "../helpers/pattern-storage";

type ProgressDelta = number | "addRow" | "takeRow";

interface RecordingProgressProps {
  recordStitches: (delta: ProgressDelta) => void;
  setRecordingProgress: React.Dispatch<React.SetStateAction<boolean>>;
  percent: number;
}

const buttonStyle = {
  marginLeft: "10px",
  marginBottom: "10px",
  backgroundColor: "#4caf50", // green color for add buttons
  color: "white",
  padding: "10px 5px",
  borderRadius: "5px",
  width: "72px",
  cursor: "pointer",
};

const minusButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#f44336", // red color for minus buttons
};

const RecordingProgress: React.FC<RecordingProgressProps> = ({
  recordStitches,
  setRecordingProgress,
  percent,
}) => {
  return (
    <>
      <div
        style={{
          textAlign: "right",
          position: "sticky",
          bottom: "0",
          paddingTop: "10px",
        }}
      >
        <button style={buttonStyle} onClick={() => recordStitches(1)}>
          +1
        </button>
        <button style={buttonStyle} onClick={() => recordStitches(5)}>
          +5
        </button>
        <button style={buttonStyle} onClick={() => recordStitches(10)}>
          +10
        </button>
        <button style={buttonStyle} onClick={() => recordStitches("addRow")}>
          +Row
        </button>
      </div>
      <div style={{ textAlign: "right" }}>
        <button style={minusButtonStyle} onClick={() => recordStitches(-1)}>
          -1
        </button>
        <button style={minusButtonStyle} onClick={() => recordStitches(-5)}>
          -5
        </button>
        <button style={minusButtonStyle} onClick={() => recordStitches(-10)}>
          -10
        </button>
        <button
          style={minusButtonStyle}
          onClick={() => recordStitches("takeRow")}
        >
          -Row
        </button>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>{percent.toFixed(2)}% complete</div>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: "#3f51b5",
            width: "150px",
            marginLeft: "10px",
            marginRight: "0px",
          }}
          onClick={() => setRecordingProgress(false)}
        >
          Stop Knitting
        </button>
      </div>
    </>
  );
};

const SavedPattern: React.FC = () => {
  const { patternId } = useParams();
  const navigate = useNavigate();

  const [recordingProgress, setRecordingProgress] = React.useState(false);
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

  const recordStitches = (delta: ProgressDelta) => {
    if (!savedPattern) return;
    const { stitches, progress } = savedPattern;
    let newProgress = progress;

    if (delta === "addRow") {
      // The stitch directly above the current one: the next stitch that lists
      // the current stitch among its links to the row below.
      const nextRowStitch = stitches
        .slice(progress)
        .find((stitch) => stitch.links.slice(0, -1).includes(progress))?.id;
      if (nextRowStitch === undefined) {
        // Already on the final row; nothing above to advance to.
        return;
      }
      newProgress = nextRowStitch;
    } else if (delta === "takeRow") {
      const currentStitch = stitches[progress];
      // All links except the last point at the row below; the last is the
      // neighbour in the current row.
      const linksBelow = currentStitch
        ? currentStitch.links.slice(0, -1)
        : [];
      // On the cast-on row there is no row below, so step back to the start
      // rather than reading past the end of the array.
      newProgress =
        linksBelow.length > 0 ? linksBelow[linksBelow.length - 1] : 0;
    } else {
      newProgress = progress + delta;
    }

    // setProgress clamps into [0, stitches.length - 1].
    setProgress(savedPattern.id, newProgress);
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
      <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
        {savedPattern.name ?? "Saved Pattern"}
      </h1>

      <KnittingPattern
        stitches={savedPattern.stitches}
        progress={savedPattern.progress}
      />
      {!recordingProgress && (
        <div style={{ textAlign: "right" }}>
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
        <RecordingProgress
          recordStitches={recordStitches}
          setRecordingProgress={setRecordingProgress}
          percent={percentComplete(savedPattern)}
        />
      )}
    </div>
  );
};

export default SavedPattern;
