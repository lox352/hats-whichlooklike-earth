import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { Stitch } from "../types/Stitch";
import { createStitchGeometry } from "./stitch-geometry";
import { dyeAmount } from "../helpers/dye-sweep";
import { HatBounds } from "./FitToHat";

interface StitchInstancesProps {
  stitches: Stitch[];
  stitchRefs: React.MutableRefObject<React.RefObject<RapierRigidBody>[]>;
  /**
   * 0 to 1: how far the dye has swept. A ref rather than a prop value, so the
   * sweep can advance every frame without re-rendering React.
   */
  dyeProgress: React.MutableRefObject<number>;
  /** Target colours, once known. Null while the hat is still undyed. */
  colours: React.MutableRefObject<Float32Array | null>;
  /** Per-stitch sweep offset in 0..1, so the dye arrives pole to pole. */
  dyeOrder: React.MutableRefObject<Float32Array | null>;
  /**
   * Filled in as this loop runs, for the camera to frame. Measured here
   * because every body's position is read anyway.
   */
  bounds: React.MutableRefObject<HatBounds>;
}

/** Undyed wool, before the earth is applied. */
const undyed = new THREE.Color("#e8e0cf");

/*
 * Scratch objects, reused every frame. With thousands of stitches, allocating
 * per stitch per frame is what makes this kind of loop crawl.
 */
const position = new THREE.Vector3();
const neighbourAcross = new THREE.Vector3();
const neighbourBelow = new THREE.Vector3();
const across = new THREE.Vector3();
const up = new THREE.Vector3();
const normal = new THREE.Vector3();
const outward = new THREE.Vector3();
const basis = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3(1, 1, 1);
const matrix = new THREE.Matrix4();
const colour = new THREE.Color();

/**
 * Draws every stitch as one instanced mesh.
 *
 * This replaces one mesh and one shader material per stitch: a default hat had
 * about 7,650 of each, which meant 7,650 draw calls a frame and 7,650 separate
 * shader programs. Instancing makes it a single draw call.
 *
 * Each stitch is oriented from its own neighbours rather than being pointed at
 * the middle of the hat. Taking the vector across the round and the vector
 * down to the row below gives the real surface normal, which is what makes the
 * fabric sit flat at the crown as well as the sides.
 */
const StitchInstances: React.FC<StitchInstancesProps> = ({
  stitches,
  stitchRefs,
  dyeProgress,
  colours,
  dyeOrder,
  bounds,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => createStitchGeometry(), []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Stitch 0 is the phantom start of the helix and is never drawn.
  const drawn = useMemo(
    () => stitches.filter((stitch) => stitch.id !== 0),
    [stitches]
  );

  /**
   * For each drawn stitch: which stitch is beside it in the round, and which
   * is below it. Worked out once, since the links never change.
   */
  const neighbours = useMemo(() => {
    const acrossOf = new Int32Array(drawn.length);
    const belowOf = new Int32Array(drawn.length);

    drawn.forEach((stitch, index) => {
      const links = stitch.links;
      // The last link is the previous stitch in the same round.
      acrossOf[index] = links.length > 0 ? links[links.length - 1] : -1;
      // Everything before it belongs to the row below; take the middle one,
      // matching how the chart anchors a stitch.
      const below = links.slice(0, -1);
      belowOf[index] =
        below.length > 0 ? below[Math.floor(below.length / 2)] : -1;
    });

    return { acrossOf, belowOf };
  }, [drawn]);

  const readPosition = (id: number, into: THREE.Vector3): boolean => {
    const body = stitchRefs.current[id]?.current;
    if (!body) return false;
    const translation = body.translation();
    into.set(translation.x, translation.y, translation.z);
    return true;
  };

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const targetColours = colours.current;
    const order = dyeOrder.current;
    const swept = dyeProgress.current;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let index = 0; index < drawn.length; index++) {
      const stitch = drawn[index];
      if (!readPosition(stitch.id, position)) continue;

      if (position.x < minX) minX = position.x;
      if (position.y < minY) minY = position.y;
      if (position.z < minZ) minZ = position.z;
      if (position.x > maxX) maxX = position.x;
      if (position.y > maxY) maxY = position.y;
      if (position.z > maxZ) maxZ = position.z;

      // Across the round, and down to the row below. Either may be missing on
      // the cast-on row or at the seam, so fall back to something sane.
      const hasAcross = readPosition(
        neighbours.acrossOf[index],
        neighbourAcross
      );
      const hasBelow = readPosition(neighbours.belowOf[index], neighbourBelow);

      if (hasAcross) {
        across.subVectors(neighbourAcross, position);
      } else {
        // Tangent of a circle about the Y axis.
        across.set(-position.z, 0, position.x);
      }
      if (across.lengthSq() < 1e-8) across.set(1, 0, 0);
      across.normalize();

      if (hasBelow) {
        up.subVectors(position, neighbourBelow);
      } else {
        up.set(0, 1, 0);
      }
      if (up.lengthSq() < 1e-8) up.set(0, 1, 0);
      up.normalize();

      normal.crossVectors(across, up);
      if (normal.lengthSq() < 1e-8) {
        normal.set(position.x, 0, position.z);
        if (normal.lengthSq() < 1e-8) normal.set(0, 0, 1);
      }
      normal.normalize();

      // Keep the face pointing away from the hat's axis rather than into it.
      outward.set(position.x, 0, position.z);
      if (outward.lengthSq() > 1e-8 && normal.dot(outward) < 0) {
        normal.negate();
        across.negate();
      }

      // Re-square the basis: up may not be perpendicular to across.
      up.crossVectors(normal, across).normalize();

      basis.makeBasis(across, up, normal);
      quaternion.setFromRotationMatrix(basis);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);

      if (targetColours) {
        const eased = dyeAmount(swept, order ? order[index] : 0);
        colour
          .setRGB(
            targetColours[index * 3],
            targetColours[index * 3 + 1],
            targetColours[index * 3 + 2],
            THREE.SRGBColorSpace
          )
          .lerpColors(undyed, colour, eased);
        mesh.setColorAt(index, colour);
      } else {
        mesh.setColorAt(index, undyed);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    if (Number.isFinite(minX) && Number.isFinite(maxY)) {
      bounds.current.min.set(minX, minY, minZ);
      bounds.current.max.set(maxX, maxY, maxZ);
      bounds.current.valid = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, drawn.length]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        roughness={0.85}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
};

export default StitchInstances;
