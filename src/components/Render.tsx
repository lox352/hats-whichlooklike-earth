import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import HatCanvas from "../ChainModel/HatCanvas";
import { Stitch } from "../types/Stitch";
import { getStitches } from "../helpers/stitches";
import { validateDesign } from "../types/KnittingMachine";
import { designFromSearchParams, designKey } from "../helpers/design-url";
import { cacheDyedHat, readDyedHat } from "../helpers/design-session";

interface RenderProps {
  stitches: Stitch[];
  setStitches: React.Dispatch<React.SetStateAction<Stitch[]>>;
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

const Render: React.FC<RenderProps> = ({ stitches, setStitches }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const design = useMemo(
    () => designFromSearchParams(searchParams),
    [searchParams]
  );
  const key = designKey(design);

  const [stage, setStage] = useState<Stage>("summoning");
  const [simulationActive, setSimulationActive] = useState(false);
  // A hat restored from the session cache is already dyed, so it must not be
  // handed to the simulation again.
  const [restored, setRestored] = useState(false);
  const simulationHasRun = useRef(false);
  const knittedFor = useRef<string | null>(null);

  const advanceTo = useCallback(
    (next: Stage) =>
      setStage((current) =>
        stageOrder.indexOf(next) > stageOrder.indexOf(current) ? next : current
      ),
    []
  );

  const handleAnyStitchRendered = useCallback(
    () => advanceTo("settling"),
    [advanceTo]
  );
  const handleDyeingComplete = useCallback(() => advanceTo("done"), [advanceTo]);

  // Knit the hat this URL asks for. Re-runs when the design changes, so
  // going back, editing and returning gives the hat you asked for rather than
  // whatever was last in memory.
  useEffect(() => {
    if (knittedFor.current === key) return;
    knittedFor.current = key;

    const alreadyDyed = readDyedHat(design);
    if (alreadyDyed) {
      setStitches(alreadyDyed);
      setRestored(true);
      setStage("done");
      return;
    }

    if (
      validateDesign(
        design.stitchesPerRow,
        design.numberOfRows,
        design.decreaseMethod
      ).length > 0
    ) {
      navigate(`/design?${searchParams.toString()}`, { replace: true });
      return;
    }

    setRestored(false);
    setStage("summoning");
    simulationHasRun.current = false;
    setStitches(
      getStitches(
        design.stitchesPerRow,
        design.numberOfRows,
        design.decreaseMethod
      )
    );
  }, [key, design, navigate, searchParams, setStitches]);

  useEffect(() => {
    if (restored) return;
    if (simulationActive) {
      simulationHasRun.current = true;
      advanceTo("settling");
      return;
    }
    if (simulationHasRun.current) {
      advanceTo("dyeing");
    }
  }, [simulationActive, advanceTo, restored]);

  // Keep the dyed hat for the rest of the tab, so reloading the chart does not
  // mean waiting for the simulation again.
  useEffect(() => {
    if (stage !== "done" || restored) return;
    cacheDyedHat(design, stitches);
  }, [stage, restored, design, stitches]);

  if (stitches.length === 0) {
    return (
      <div style={{ textAlign: "left", padding: "20px" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
          Dyeing Your Hat
        </h1>
        <p style={{ fontStyle: "italic" }}>Casting on...</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
        Dyeing Your Hat
      </h1>
      <HatCanvas
        stitches={stitches}
        setStitches={restored ? undefined : setStitches}
        orientationParameters={design.orientation}
        simulationActive={simulationActive}
        setSimulationActive={restored ? undefined : setSimulationActive}
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
            onClick={() => navigate(`/pattern?${searchParams.toString()}`)}
          >
            Generate Pattern
          </button>
        </div>
      )}
    </div>
  );
};

export default Render;
