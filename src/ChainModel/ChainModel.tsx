import React, { useEffect, useMemo, useRef, useState } from "react";
import { Stitch } from "../types/Stitch";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import StitchPhysics from "./StitchPhysics";
import Settler from "./Settler";
import FrameHat, { OrbitLike } from "./FrameHat";
import { settleTimeStep, solverIterations } from "../constants";
import { predictHatShape } from "../helpers/hat-shape";
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

  const controls = useRef<OrbitLike | null>(null);

  /*
   * How big the hat is going to be, worked out before it settles, so the
   * camera can be placed once and then left alone. See helpers/hat-shape.
   */
  const shape = useMemo(() => predictHatShape(stitches), [stitches]);

  /*
   * The hat turns slowly on its own until the first time anyone touches it,
   * and then never again. Auto-rotation that resumes after you let go fights
   * whoever is trying to look at something.
   */
  const [touched, setTouched] = useState(false);

  return (
    <Canvas
      camera={{ fov: 38, near: 0.5, far: 4000 }}
      /*
       * Transparent, so the stage behind it provides the ground and the hat
       * sits on paper in light mode and on ink in dark mode. The canvas used
       * to paint its own near-black regardless of the theme.
       */
      style={{ backgroundColor: "transparent" }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      {/* Wool is matte, so the light does the work: a soft key from above and
          in front, a dim fill from below to keep the inside of the brim from
          going black, and a cool rim to pick out the silhouette. */}
      <hemisphereLight args={["#dfeaf6", "#2a2118", 0.55]} />
      {/*
        No shadow casting. There is no ground plane for a shadow to fall on, so
        the only effect was the hat shadowing itself, and a directional light's
        shadow camera defaults to a box ten units across while the hat is
        around a hundred. That left a dark square patch wherever the little
        frustum happened to land.
      */}
      <directionalLight position={[-132, 264, 192]} intensity={1.85} />
      <directionalLight position={[192, -48, -144]} intensity={0.35} />
      <directionalLight position={[48, 72, -240]} intensity={0.5} />

      <FrameHat shape={shape} controls={controls} />

      <OrbitControls
        ref={controls as never}
        // Turnable from the first frame, including while the hat settles.
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={0.7}
        autoRotate={!touched}
        autoRotateSpeed={0.35}
        onStart={() => setTouched(true)}
        makeDefault
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
