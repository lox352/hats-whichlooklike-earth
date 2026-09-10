import React, { useEffect, useMemo, useRef, useState } from "react";
import StitchBody from "./StitchBody";
import StitchInstances from "./StitchInstances";
import Link from "./Link";
import { RapierRigidBody } from "@react-three/rapier";
import { Stitch } from "../types/Stitch";
import { colourNodes } from "../helpers/node-colouring";
import { dyeOrderFromHeights, heightsOf } from "../helpers/dye-sweep";
import {
  adjacentStitchDistance,
  dyeSweepSeconds,
  maxDyeStepSeconds,
  minimumSettleFrames,
  restMotionThreshold,
  settleRestSeconds,
  verticalStitchDistance,
} from "../constants";
import { useFrame } from "@react-three/fiber";
import { OrientationParameters } from "../types/OrientationParameters";

interface StitchPhysicsProps {
  stitchesRef: React.MutableRefObject<Stitch[]>;
  setStitches?: React.Dispatch<React.SetStateAction<Stitch[]>>;
  orientationParameters: OrientationParameters;
  simulationActive: boolean;
  setSimulationActive?: React.Dispatch<React.SetStateAction<boolean>>;
  onAnyStitchRendered?: () => void;
  /** Fired once the whole hat has been coloured and the dye has finished. */
  onDyeingComplete?: () => void;
}

const StitchPhysics: React.FC<StitchPhysicsProps> = ({
  stitchesRef,
  setStitches,
  orientationParameters,
  simulationActive,
  setSimulationActive,
  onAnyStitchRendered,
  onDyeingComplete,
}) => {
  const setRefsVersion = useState(0)[1];
  const frameNumber = useRef(0);
  const restingFor = useRef(0);
  const stitches = stitchesRef.current;

  // Built once and then grown/shrunk in the effect below. Passing the mapped
  // array straight to useRef would rebuild it on every render and throw the
  // result away.
  const stitchRefs = useRef<React.RefObject<RapierRigidBody>[]>([]);
  if (stitchRefs.current.length === 0) {
    stitchRefs.current = stitches.map(() => React.createRef());
  }

  /*
   * The dye, as three pieces of frame-local state the renderer reads directly.
   * Refs rather than React state: these change every frame while the dye
   * sweeps, and re-rendering thousands of instances for each step would undo
   * the point of instancing them.
   */
  const targetColours = useRef<Float32Array | null>(null);
  const dyeOrder = useRef<Float32Array | null>(null);
  const dyeProgress = useRef(0);
  const dyeStartedAt = useRef<number | null>(null);
  const dyeReported = useRef(false);

  // Colouring is expensive and must happen exactly once per mount, even though
  // useFrame can re-enter while the async work is in flight.
  const colouringStarted = useRef(false);

  const drawnCount = useMemo(
    () => stitches.filter((stitch) => stitch.id !== 0).length,
    [stitches]
  );

  useFrame((_, delta) => {
    if (onAnyStitchRendered && frameNumber.current === 0) {
      onAnyStitchRendered();
    }

    // Advance the sweep once colours are known.
    if (dyeStartedAt.current !== null && dyeProgress.current < 1) {
      // Clamped: see maxDyeStepSeconds. The frame after colouring carries
      // the whole stall as its delta and would skip the sweep entirely.
      dyeProgress.current = Math.min(
        dyeProgress.current +
          Math.min(delta, maxDyeStepSeconds) / dyeSweepSeconds,
        1
      );
      if (dyeProgress.current >= 1 && !dyeReported.current) {
        dyeReported.current = true;
        onDyeingComplete?.();
      }
    }

    if (!setSimulationActive || !setStitches) return;
    if (frameNumber.current === 0) {
      setSimulationActive(true);
    }
    if (!simulationActive) return;
    frameNumber.current++;

    // Check velocities of all rigid bodies
    let totalMotion = 0;
    stitchRefs.current.forEach((stitchRef) => {
      const velocity = stitchRef.current?.linvel();
      const motionChange = velocity
        ? Math.abs(velocity.x) + Math.abs(velocity.y) + Math.abs(velocity.z)
        : 0;
      totalMotion += motionChange;
    });

    // Stop simulating once the hat has come to rest, and has stayed there.
    const threshold = restMotionThreshold * stitchRefs.current.length;
    if (totalMotion > threshold || frameNumber.current < minimumSettleFrames) {
      restingFor.current = 0;
      return;
    }
    restingFor.current += delta;
    if (restingFor.current < settleRestSeconds) return;

    setSimulationActive(false);

    if (colouringStarted.current) return;
    colouringStarted.current = true;

    (async () => {
      const positions = stitchRefs.current.map(
        (stitchRef, index) =>
          stitchRef.current?.translation() ?? stitches[index].position
      );

      const colours = await colourNodes(positions, orientationParameters);

      /*
       * Pack the colours for the instanced mesh, and work out the order the
       * dye arrives in: from the crown downwards, so the earth pours down the
       * hat rather than appearing all at once.
       */
      const drawn = stitches.filter((stitch) => stitch.id !== 0);
      const packed = new Float32Array(drawn.length * 3);
      drawn.forEach((stitch, index) => {
        const colour = colours[stitch.id] ?? stitch.colour;
        packed[index * 3] = colour[0] / 255;
        packed[index * 3 + 1] = colour[1] / 255;
        packed[index * 3 + 2] = colour[2] / 255;
      });
      const order = dyeOrderFromHeights(
        heightsOf(drawn.map((stitch) => positions[stitch.id] ?? stitch.position))
      );

      targetColours.current = packed;
      dyeOrder.current = order;
      dyeStartedAt.current = performance.now();

      // One state update for the whole hat rather than one per stitch.
      setStitches((current) =>
        current.map((stitch, index) => ({
          ...stitch,
          colour: colours[index] ?? stitch.colour,
          position: positions[index] ?? stitch.position,
        }))
      );
    })();
  });

  useEffect(() => {
    for (let i = stitchRefs.current.length; i < stitches.length; i++) {
      stitchRefs.current.push(React.createRef<RapierRigidBody>());
    }

    if (stitchRefs.current.length > stitches.length) {
      stitchRefs.current.splice(stitches.length);
    }

    stitches.forEach((stitch) => {
      const ref = stitchRefs.current[stitch.id];
      if (!ref?.current) return;
      if (stitch.links.length <= 1) {
        ref.current.setTranslation(stitch.position, false);
        ref.current.setBodyType(1, false); // fixed
      } else {
        ref.current.setBodyType(0, false); // dynamic
      }
    });

    setRefsVersion((v) => (v + 1) % 1000);
  }, [stitches, setRefsVersion]);

  /*
   * A hat that arrives already coloured (a saved pattern, or one restored from
   * the session cache) is not dyed again: show it finished from the first
   * frame.
   */
  useEffect(() => {
    if (setStitches) return;
    const drawn = stitches.filter((stitch) => stitch.id !== 0);
    const packed = new Float32Array(drawn.length * 3);
    drawn.forEach((stitch, index) => {
      packed[index * 3] = stitch.colour[0] / 255;
      packed[index * 3 + 1] = stitch.colour[1] / 255;
      packed[index * 3 + 2] = stitch.colour[2] / 255;
    });
    targetColours.current = packed;
    dyeOrder.current = new Float32Array(drawn.length);
    dyeProgress.current = 1;
  }, [stitches, setStitches]);

  return (
    <React.Fragment>
      {stitches.map((stitch) => {
        const stitchRef = stitchRefs.current[stitch.id];
        if (!stitchRef) return null;
        return (
          <StitchBody
            key={stitch.id}
            rigidBodyRef={stitchRef}
            position={stitch.position}
            fixed={stitch.links.length <= 1}
          />
        );
      })}
      {drawnCount > 0 && (
        <StitchInstances
          stitches={stitches}
          stitchRefs={stitchRefs}
          dyeProgress={dyeProgress}
          colours={targetColours}
          dyeOrder={dyeOrder}
        />
      )}
      {stitches.flatMap((stitch) =>
        stitch.links.map((link) => {
          const stitchRef = stitchRefs.current[stitch.id];
          const linkedStitchRef = stitchRefs.current[link];
          if (!stitchRef || !linkedStitchRef) return null;
          const stitchLength =
            stitch.id - link === 1
              ? adjacentStitchDistance
              : verticalStitchDistance;
          return (
            <Link
              key={`${stitch.id}-${link}`}
              bodyA={stitchRef}
              bodyB={linkedStitchRef}
              maxLength={stitchLength}
            />
          );
        })
      )}
    </React.Fragment>
  );
};

export default StitchPhysics;
