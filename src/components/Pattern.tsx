import React from "react";
import { Stitch } from "../types/Stitch";
import KnittingPattern from "../KnittingPattern";
import { SavedPattern } from "../types/SavedPattern";

interface PatternProps {
  stitches: Stitch[];
}

const Pattern: React.FC<PatternProps> = ({ stitches }) => {
  const [patternSaved, setPatternSaved] = React.useState(false);
  const saveToLocalStorage = () => {
    const patternName = prompt("Please enter a name for your pattern:");

    const patternId = Date.now().toString();
    const storageKey = `pattern-${patternId}`;
    const savedPattern: SavedPattern = {
      id: storageKey,
      name: patternName ?? undefined,
      savedAt: new Date(),
      stitches,
      progress: 0,
    };
    localStorage.setItem(storageKey, JSON.stringify(savedPattern));
    window.location.hash = `#/pattern/${patternId}`;
    setPatternSaved(true);
    alert(
      "Stitches saved to local storage! This pattern may be accessed at any time from the homepage."
    );
  };

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>Hat Pattern</h1>
      <KnittingPattern stitches={stitches} progress={0} />
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
  );
};

export default Pattern;
