import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Stitch } from "../types/Stitch";
import KnittingPattern from "../KnittingPattern";
import ChartActions from "./ChartActions";
import ChartPrintSheet from "./ChartPrintSheet";
import YarnChoicesEditor from "./YarnChoices";
import WrittenInstructions from "./WrittenInstructions";
import { bareIdFor, createPattern } from "../helpers/pattern-storage";
import { designFromSearchParams } from "../helpers/design-url";
import { readDyedHat } from "../helpers/design-session";
import { useYarns } from "../useYarns";

interface PatternProps {
  stitches: Stitch[];
}

const buttonStyle: React.CSSProperties = {
  marginTop: "20px",
  color: "white",
  padding: "10px 20px",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

const Pattern: React.FC<PatternProps> = ({ stitches }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const design = useMemo(
    () => designFromSearchParams(searchParams),
    [searchParams]
  );

  const { yarns, setYarns } = useYarns();
  const [patternSaved, setPatternSaved] = useState(false);

  /*
   * A reload loses the hat held in memory, but the tab still remembers the one
   * that was dyed for this design. Derived rather than held in state: the
   * design can change under us without the component remounting, and a stale
   * copy would chart the previous hat under the new design's URL.
   */
  const restored = useMemo(
    () => (stitches.length === 0 ? readDyedHat(design) : undefined),
    [stitches.length, design]
  );

  const charted = stitches.length > 0 ? stitches : restored ?? [];

  useEffect(() => {
    if (charted.length > 0) return;
    // Nothing to chart and nothing remembered: send them back to the design
    // they asked for rather than to an empty homepage.
    navigate(`/design?${searchParams.toString()}`, { replace: true });
  }, [charted.length, navigate, searchParams]);

  if (charted.length === 0) {
    return null;
  }

  const saveToLocalStorage = () => {
    const patternName = prompt("Please enter a name for your pattern:");
    if (patternName === null) {
      return;
    }

    const { result, pattern } = createPattern(charted, patternName);
    if (!result.ok) {
      alert(
        "Local storage is full. Please delete a pattern from the home page and try again."
      );
      return;
    }

    setPatternSaved(true);
    navigate(`/pattern/${bareIdFor(pattern.id)}`);
  };

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 className="screen-only" style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
        Hat Pattern
      </h1>
      <div className="screen-only">
        <KnittingPattern stitches={charted} progress={0} />
      </div>
      <ChartPrintSheet stitches={charted} title="Hat Pattern" />
      <ChartActions stitches={charted} name="hat-pattern" />
      <YarnChoicesEditor yarns={yarns} setYarns={setYarns} />
      <WrittenInstructions stitches={charted} />
      <div className="screen-only" style={{ textAlign: "right" }}>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: "#f44336",
            marginRight: "10px",
          }}
          onClick={() => navigate("/")}
        >
          Start Again
        </button>
        {!patternSaved && (
          <button
            style={{ ...buttonStyle, backgroundColor: "#3f51b5" }}
            onClick={saveToLocalStorage}
          >
            Save Pattern
          </button>
        )}
      </div>
    </div>
  );
};

export default Pattern;
