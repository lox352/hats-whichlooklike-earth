import React, { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import PointMass from "./PointMass";
import Link from "./Link";
import { RapierRigidBody } from "@react-three/rapier";
import { Stitch } from "../types/Stitch";
import { colourNodes } from "../helpers/node-colouring";
import * as THREE from "three";
import {
  adjacentStitchDistance,
  minimumSettleFrames,
  restMotionThreshold,
  verticalStitchDistance,
} from "../constants";
import { useFrame } from "@react-three/fiber";
import { OrientationParameters } from "../types/OrientationParameters";

function createChevronTexture() {
  const size = 256; // Texture resolution
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "white";

    // Draw downward-facing chevron
    ctx.beginPath();
    ctx.moveTo(size / 2, size * 1); // Bottom center (tip of the V)
    ctx.lineTo(size * 0, size * 0); // Left top
    ctx.lineTo(size * 0.25, size * 0); // Left top
    ctx.lineTo(size * 0.5, size * 0.5); // Center bottom left
    ctx.lineTo(size * 0.75, size * 0); // Right top
    ctx.lineTo(size * 1, size * 0); // Right top
    ctx.lineTo(size / 2, size * 1); // Back to bottom center
    ctx.closePath();
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

interface StitchPhysicsProps {
  stitchesRef: React.MutableRefObject<Stitch[]>;
  setStitches?: React.Dispatch<React.SetStateAction<Stitch[]>>;
  orientationParameters: OrientationParameters;
  simulationActive: boolean;
  setSimulationActive?: React.Dispatch<React.SetStateAction<boolean>>;
  onAnyStitchRendered?: () => void;
  /** Fired once the whole hat has been coloured and the colours applied. */
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
  const stitches = stitchesRef.current;

  // The texture and geometry are owned by this component instance, not the
  // module, so disposing them on unmount cannot affect a later mount.
  const chevronTexture = useMemo(() => createChevronTexture(), []);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  // Built once and then grown/shrunk in the effect below. Passing the mapped
  // array straight to useRef would rebuild it on every render and throw the
  // result away.
  const stitchRefs = useRef<React.RefObject<RapierRigidBody>[]>([]);
  if (stitchRefs.current.length === 0) {
    stitchRefs.current = stitches.map(() => React.createRef());
  }

  const colourRefs = useRef<React.MutableRefObject<Float32Array>[]>([]);
  if (colourRefs.current.length === 0) {
    colourRefs.current = stitches.map((stitch) => {
      const ref = React.createRef() as MutableRefObject<Float32Array>;
      ref.current = new Float32Array([
        stitch.colour[0] / 255,
        stitch.colour[1] / 255,
        stitch.colour[2] / 255,
      ]);
      return ref;
    });
  }

  // Colouring is expensive and must happen exactly once per mount, even though
  // useFrame can re-enter while the async work is in flight.
  const colouringStarted = useRef(false);

  useFrame(() => {
    if (onAnyStitchRendered && frameNumber.current === 0) {
      onAnyStitchRendered();
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

    // Stop simulating once the hat has come to rest.
    const threshold = restMotionThreshold * stitchRefs.current.length;
    if (totalMotion > threshold || frameNumber.current < minimumSettleFrames) {
      return;
    }

    setSimulationActive(false);

    if (colouringStarted.current) return;
    colouringStarted.current = true;

    (async () => {
      const positions = stitchRefs.current.map(
        (stitchRef, index) =>
          stitchRef.current?.translation() ?? stitches[index].position
      );

      const colours = await colourNodes(positions, orientationParameters);

      colourRefs.current.forEach((colourRef, index) => {
        const colour = colours[index];
        if (!colourRef.current || !colour) return;
        colourRef.current[0] = colour[0] / 255;
        colourRef.current[1] = colour[1] / 255;
        colourRef.current[2] = colour[2] / 255;
      });

      // One state update for the whole hat rather than one per stitch.
      setStitches((current) =>
        current.map((stitch, index) => ({
          ...stitch,
          colour: colours[index] ?? stitch.colour,
          position: positions[index] ?? stitch.position,
        }))
      );

      onDyeingComplete?.();
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

  useEffect(() => {
    return () => {
      chevronTexture.dispose();
      geometry.dispose();
    };
  }, [chevronTexture, geometry]);

  return (
    <React.Fragment>
      {stitches.map((stitch) => {
        const stitchRef = stitchRefs.current[stitch.id];

        if (!stitchRef) return null;
        return (
          <PointMass
            key={stitch.id}
            rigidBodyRef={stitchRef}
            position={stitch.position}
            fixed={stitch.links.length <= 1}
            visible={stitch.id > 0}
            colourRef={colourRefs.current[stitch.id]}
            chevronTexture={chevronTexture}
            geometry={geometry}
          />
        );
      })}
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
