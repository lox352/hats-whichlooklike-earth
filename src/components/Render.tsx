import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import HatCanvas from "../ChainModel/HatCanvas";
import { Stitch } from "../types/Stitch";
import { getStitches } from "../helpers/stitches";
import { validateDesign } from "../types/KnittingMachine";
import { designFromSearchParams, designKey } from "../helpers/design-url";
import { cacheDyedHat, readDyedHat } from "../helpers/design-session";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import "./Render.css";

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

  const working = stage !== "done";

  if (stitches.length === 0) {
    return (
      <PageLayout title="Dyeing your hat" step="dye">
        <p className="render-status render-status-working">Casting on...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Dyeing your hat"
      step="dye"
      lede="Every stitch takes the colour of whatever it lands on once the hat settles."
    >
      <div className="hat-stage">
        <HatCanvas
        stitches={stitches}
        setStitches={restored ? undefined : setStitches}
        orientationParameters={design.orientation}
        simulationActive={simulationActive}
        setSimulationActive={restored ? undefined : setSimulationActive}
        onAnyStitchRendered={handleAnyStitchRendered}
          onDyeingComplete={handleDyeingComplete}
        />
      </div>
      <p
        aria-live="polite"
        className={`render-status${working ? " render-status-working" : ""}`}
      >
        {statusText[stage]}
      </p>
      {stage === "done" && (
        <div className="render-actions">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate(`/pattern?${searchParams.toString()}`)}
          >
            Make the chart
          </Button>
          <Button
            variant="quiet"
            onClick={() => navigate(`/design?${searchParams.toString()}`)}
          >
            Back to the design
          </Button>
        </div>
      )}
    </PageLayout>
  );
};

export default Render;
