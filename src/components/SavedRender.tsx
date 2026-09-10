import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import HatCanvas from "../ChainModel/HatCanvas";
import { readPattern } from "../helpers/pattern-storage";

const SavedRender: React.FC = () => {
  const navigate = useNavigate();
  const { patternId } = useParams();
  const [anyStitchRendered, setAnyStitchRendered] = React.useState(false);

  // Read once per id rather than on every render.
  const pattern = React.useMemo(() => readPattern(patternId), [patternId]);

  if (!pattern || pattern.stitches.length === 0) {
    return (
      <div style={{ textAlign: "left", padding: "20px" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
          Pattern not found
        </h1>
        <button
          style={{
            backgroundColor: "#3f51b5",
            color: "white",
            padding: "10px 20px",
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
      <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>Pre-dyed Hat</h1>
      <HatCanvas
        stitches={pattern.stitches}
        simulationActive={false}
        onAnyStitchRendered={() => setAnyStitchRendered(true)}
      />
      <p aria-live="polite" style={{ fontStyle: "italic" }}>
        {!anyStitchRendered
          ? "Summoning stitches..."
          : "Pinch and zoom to see the pattern in more detail"}
      </p>
      <div style={{ marginTop: "10px" }}>
        <button
          style={{
            backgroundColor: "#3f51b5",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => navigate(`/pattern/${patternId}`)}
        >
          Go to Pattern
        </button>
      </div>
    </div>
  );
};

export default SavedRender;
