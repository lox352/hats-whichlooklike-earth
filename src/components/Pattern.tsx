import React from "react";
import { useNavigate } from "react-router-dom";
import { Stitch } from "../types/Stitch";
import KnittingPattern from "../KnittingPattern";
import { bareIdFor, createPattern } from "../helpers/pattern-storage";

interface PatternProps {
  stitches: Stitch[];
}

const Pattern: React.FC<PatternProps> = ({ stitches }) => {
  const navigate = useNavigate();
  const [patternSaved, setPatternSaved] = React.useState(false);

  // Reaching /pattern without stitches (a refresh, or a pasted link) would
  // otherwise render a grid with -Infinity rows.
  React.useEffect(() => {
    if (stitches.length === 0) {
      navigate("/", { replace: true });
    }
  }, [stitches, navigate]);

  if (stitches.length === 0) {
    return null;
  }

  const saveToLocalStorage = () => {
    const patternName = prompt("Please enter a name for your pattern:");
    if (patternName === null) {
      return;
    }

    const { result, pattern } = createPattern(stitches, patternName);
    if (!result.ok) {
      alert(
        "Local storage is full. Please delete a pattern from the home page and try again."
      );
      return;
    }

    setPatternSaved(true);
    alert(
      "Stitches saved to local storage! This pattern may be accessed at any time from the homepage."
    );
    navigate(`/pattern/${bareIdFor(pattern.id)}`);
  };

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>Hat Pattern</h1>
      <KnittingPattern stitches={stitches} progress={0} />
      <div style={{ textAlign: "right" }}>
        <button
          style={{
            marginTop: "20px",
            backgroundColor: "#f44336",
            color: "white",
            padding: "10px 20px",
            marginRight: "10px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          Start Again
        </button>
        {!patternSaved && (
          <button
            style={{
              marginTop: "20px",
              backgroundColor: "#3f51b5",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
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
