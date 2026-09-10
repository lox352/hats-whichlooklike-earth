import React, { useEffect, useMemo, useRef } from "react";
import { Stitch } from "../types/Stitch";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import StitchPhysics from "./StitchPhysics";
import Settler from "./Settler";
import FitToHat, { HatBounds, OrbitLike } from "./FitToHat";
import * as THREE from "three";
import {
  adjacentStitchDistance,
  settleTimeStep,
  solverIterations,
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

  /*
   * Where the camera ends up is decided by FitToHat, from the hat's measured
   * bounding box. This is only a starting direction to look from, so the
   * first frame is not staring at the inside of the brim.
   */
  const bounds = useRef<HatBounds>({
    min: new THREE.Vector3(),
    max: new THREE.Vector3(),
    valid: false,
  });
  const controls = useRef<OrbitLike | null>(null);

  /*
   * A first guess at where to stand, from the cast-on radius. FitToHat works
   * out the real framing from the settled hat and eases the camera over, so
   * this only has to be in the right neighbourhood: start it somewhere silly
   * and the opening ease becomes a long swoop.
   *
   * The multiplier is the ratio the fit converges to for a hat of these
   * proportions, measured rather than derived.
   */
  const initialCamera = useMemo<[number, number, number]>(() => {
    const stitchesPerRow = Math.max(countCastOnStitches(stitches), 1);
    const radius = (stitchesPerRow * adjacentStitchDistance) / (2 * Math.PI);
    const distance = Math.max(radius * 4.6, 40);
    // Slightly above the hat, looking down at it.
    return [-distance * 0.74, distance * 0.42, distance * 0.5];
  }, [stitches]);

  return (
    <Canvas
      camera={{ position: initialCamera, fov: 38, near: 0.5, far: 4000 }}
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

      <OrbitControls
        ref={controls as never}
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
        <FitToHat
          bounds={bounds}
          settled={!simulationActive}
          controls={controls}
        />
        <Settler active={simulationActive} />
        <StitchPhysics
          stitchesRef={stitchesRef}
          setStitches={setStitches}
          orientationParameters={orientationParameters}
          simulationActive={simulationActive}
          setSimulationActive={setSimulationActive}
          onAnyStitchRendered={onAnyStitchRendered}
          onDyeingComplete={onDyeingComplete}
          bounds={bounds}
        />
      </Physics>
    </Canvas>
  );
};

export default ChainModel;
