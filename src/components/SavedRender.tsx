import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import HatCanvas from "../ChainModel/HatCanvas";
import { readPattern } from "../helpers/pattern-storage";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import "./Render.css";

const SavedRender: React.FC = () => {
  const navigate = useNavigate();
  const { patternId } = useParams();
  const [anyStitchRendered, setAnyStitchRendered] = React.useState(false);

  // Read once per id rather than on every render.
  const pattern = React.useMemo(() => readPattern(patternId), [patternId]);

  if (!pattern || pattern.stitches.length === 0) {
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

  return (
    <PageLayout
      title={pattern.name ?? "Your hat"}
      lede="Drag to turn it, scroll to zoom."
    >
      <div className="hat-stage">
        <HatCanvas
          stitches={pattern.stitches}
          simulationActive={false}
          onAnyStitchRendered={() => setAnyStitchRendered(true)}
        />
      </div>
      <p
        aria-live="polite"
        className={`render-status${anyStitchRendered ? "" : " render-status-working"}`}
      >
        {anyStitchRendered
          ? "Pinch and zoom to see the stitches."
          : "Summoning stitches..."}
      </p>
      <div className="render-actions">
        <Button
          variant="primary"
          onClick={() => navigate(`/pattern/${patternId}`)}
        >
          Go to the chart
        </Button>
        <Button variant="quiet" onClick={() => navigate("/")}>
          Back to your hats
        </Button>
      </div>
    </PageLayout>
  );
};

export default SavedRender;
