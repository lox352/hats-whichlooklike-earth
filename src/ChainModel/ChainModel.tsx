import React, { useEffect, useRef } from "react";
import { Stitch } from "../types/Stitch";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import StitchPhysics from "./StitchPhysics";
import Settler from "./Settler";
import * as THREE from "three";
import {
  settleTimeStep,
  solverIterations,
  verticalStitchDistance,
} from "../constants";
import { countCastOnStitches } from "../helpers/stitches";
import {
  defaultOrientationParameters,
  OrientationParameters,
} from "../types/OrientationParameters";

interface ChainModelProps {
  stitches: Stitch[];
  setStitches?: React.Dispatch<React.SetStateAction<Stitch[]>>;
  orientationParameters?: OrientationParameters;
  simulationActive: boolean;
  setSimulationActive?: React.Dispatch<React.SetStateAction<boolean>>;
  onAnyStitchRendered?: () => void;
  onDyeingComplete?: () => void;
}

const ChainModel: React.FC<ChainModelProps> = ({
  stitches,
  setStitches,
  orientationParameters = defaultOrientationParameters,
  simulationActive,
  setSimulationActive,
  onAnyStitchRendered,
  onDyeingComplete,
}) => {
  const stitchesRef = useRef(stitches);
  // Keep the ref in step with the prop; the physics children read through it.
  useEffect(() => {
    stitchesRef.current = stitches;
  }, [stitches]);

  const stitchesPerRow = Math.max(countCastOnStitches(stitches), 1);
  const roughHeight =
    (verticalStitchDistance * stitches.length) / stitchesPerRow;

  return (
    <Canvas
      camera={{ position: [(-4 * stitchesPerRow) / 5, roughHeight / 2, 0] }}
      style={{ backgroundColor: "rgb(20, 20, 20)" }}
      shadows={"basic"}
    >
      <OrbitControls
        target={new THREE.Vector3(0, (5 * roughHeight) / 12, 0)}
        enabled={!simulationActive}
      />
      <Physics
        gravity={[0, 9.81, 0]}
        timeStep={settleTimeStep}
        numSolverIterations={solverIterations}
        /*
         * Always paused: Settler drives the stepping, so the simulation does
         * not depend on how fast this machine renders. See Settler.
         */
        paused
      >
        <Settler active={simulationActive} />
        <StitchPhysics
          stitchesRef={stitchesRef}
          setStitches={setStitches}
          orientationParameters={orientationParameters}
          simulationActive={simulationActive}
          setSimulationActive={setSimulationActive}
          onAnyStitchRendered={onAnyStitchRendered}
          onDyeingComplete={onDyeingComplete}
        />
      </Physics>
    </Canvas>
  );
};

export default ChainModel;
