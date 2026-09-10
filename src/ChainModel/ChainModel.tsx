import React, { useEffect, useMemo, useRef } from "react";
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

  /*
   * Frame the hat from its own dimensions rather than a guess.
   *
   * The radius follows from the stitch count, since the cast-on row is a
   * circle of that many stitches; the height from how many rows there are.
   * The camera is then pulled back far enough to see the whole thing, and the
   * controls target its middle rather than a fraction of a mis-measured
   * height.
   */
  const { cameraPosition, target } = useMemo(() => {
    const radius = (stitchesPerRow * 2) / (2 * Math.PI);
    const height = (verticalStitchDistance * stitches.length) / stitchesPerRow;
    const centre = height * 0.45;
    // Far enough back that the widest part fits with a little air around it.
    const distance = Math.max(radius * 3.5, height * 2.3);
    return {
      cameraPosition: [-distance * 0.72, centre + height * 0.35, distance * 0.5] as [
        number,
        number,
        number
      ],
      target: new THREE.Vector3(0, centre, 0),
    };
  }, [stitchesPerRow, stitches.length]);

  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 38, near: 0.5, far: 4000 }}
      /*
       * Transparent, so the stage behind it provides the ground and the hat
       * sits on paper in light mode and on ink in dark mode. The canvas used
       * to paint its own near-black regardless of the theme.
       */
      style={{ backgroundColor: "transparent" }}
      gl={{ alpha: true, antialias: true }}
      shadows
      dpr={[1, 2]}
    >
      {/* Wool is matte, so the light does the work: a soft key from above and
          in front, a dim fill from below to keep the inside of the brim from
          going black, and a cool rim to pick out the silhouette. */}
      <hemisphereLight args={["#dfeaf6", "#2a2118", 0.55]} />
      <directionalLight
        position={[-132, 264, 192]}
        intensity={1.85}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[192, -48, -144]} intensity={0.35} />
      <directionalLight position={[48, 72, -240]} intensity={0.5} />

      <OrbitControls
        target={target}
        enabled={!simulationActive}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={0.7}
        // A slow turn once it is finished, so the hat shows itself off; any
        // interaction stops it, and it never spins while settling.
        autoRotate={!simulationActive}
        autoRotateSpeed={0.35}
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
