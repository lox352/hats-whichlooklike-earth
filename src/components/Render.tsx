import React, { useCallback, useEffect, useRef, useState } from "react";
import HatCanvas from "../ChainModel/HatCanvas";
import { Stitch } from "../types/Stitch";
import { useNavigate } from "react-router-dom";
import { OrientationParameters } from "../types/OrientationParameters";

interface RenderProps {
  stitches: Stitch[];
  setStitches: React.Dispatch<React.SetStateAction<Stitch[]>>;
  orientationParameters: OrientationParameters;
}

type Stage = "summoning" | "settling" | "dyeing" | "done";

const statusText: Record<Stage, string> = {
  summoning: "Summoning stitches...",
  settling: "Letting stitches settle...",
  dyeing: "Dyeing your hat...",
  done: "Pinch and zoom to see the pattern in more detail",
};

/**
 * Stages only ever move forward. The physics signals and the colouring signal
 * arrive from different places, and colouring can finish before React has
 * processed the "simulation stopped" update, so ordering must not matter.
 */
const stageOrder: Stage[] = ["summoning", "settling", "dyeing", "done"];

const Render: React.FC<RenderProps> = ({
  stitches,
  setStitches,
  orientationParameters,
}) => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("summoning");
  const [simulationActive, setSimulationActive] = useState(false);
  const simulationHasRun = useRef(false);

  const advanceTo = useCallback(
    (next: Stage) =>
      setStage((current) =>
        stageOrder.indexOf(next) > stageOrder.indexOf(current) ? next : current
      ),
    []
  );

  // The stage is driven by signals from the physics component rather than by
  // counting effect runs and guessing with a timeout.
  const handleAnyStitchRendered = useCallback(
    () => advanceTo("settling"),
    [advanceTo]
  );
  const handleDyeingComplete = useCallback(() => advanceTo("done"), [advanceTo]);

  useEffect(() => {
    if (simulationActive) {
      simulationHasRun.current = true;
      advanceTo("settling");
      return;
    }
    // Physics has come to rest, so colouring is under way.
    if (simulationHasRun.current) {
      advanceTo("dyeing");
    }
  }, [simulationActive, advanceTo]);

  useEffect(() => {
    if (stitches.length === 0) {
      navigate("/", { replace: true });
    }
  }, [stitches, navigate]);

  if (stitches.length === 0) {
    return null;
  }

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
        Dyeing Your Hat
      </h1>
      <HatCanvas
        stitches={stitches}
        setStitches={setStitches}
        orientationParameters={orientationParameters}
        simulationActive={simulationActive}
        setSimulationActive={setSimulationActive}
        onAnyStitchRendered={handleAnyStitchRendered}
        onDyeingComplete={handleDyeingComplete}
      />
      <p aria-live="polite" style={{ fontStyle: "italic" }}>
        {statusText[stage]}
      </p>
      {stage === "done" && (
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
            onClick={() => navigate("/pattern")}
          >
            Generate Pattern
          </button>
        </div>
      )}
    </div>
  );
};

export default Render;
