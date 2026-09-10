import * as THREE from "three";
import { adjacentStitchDistance, verticalStitchDistance } from "../constants";

/**
 * The geometry of a single knitted stitch.
 *
 * A stitch in stocking stitch is a V: two legs of yarn rising from a point,
 * each tucking behind the row above. The flat chevron sprite this replaces
 * suggested that shape but had no thickness, no normals to catch light, and
 * was sized so the sprites overlapped rather than interlocked.
 *
 * Built as a tube along a V-shaped curve, so it reads as yarn rather than as
 * a symbol, and sized from the same spacing constants the physics uses so
 * neighbouring stitches meet.
 */

const halfWidth = adjacentStitchDistance / 2;

/**
 * The V, in the stitch's own space: x across the round, y up the hat, z out
 * from the surface. The legs bow outward and dip in the middle, which is what
 * gives knitting its plaited look.
 */
const stitchCurve = (): THREE.CatmullRomCurve3 => {
  const top = verticalStitchDistance * 0.78;
  const dip = verticalStitchDistance * -0.42;
  // Legs lean back at the top, as they pass under the row above.
  const behind = -adjacentStitchDistance * 0.16;

  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-halfWidth * 0.98, top, behind),
      new THREE.Vector3(-halfWidth * 0.72, top * 0.34, 0),
      new THREE.Vector3(-halfWidth * 0.3, dip * 0.55, halfWidth * 0.12),
      new THREE.Vector3(0, dip, halfWidth * 0.16),
      new THREE.Vector3(halfWidth * 0.3, dip * 0.55, halfWidth * 0.12),
      new THREE.Vector3(halfWidth * 0.72, top * 0.34, 0),
      new THREE.Vector3(halfWidth * 0.98, top, behind),
    ],
    false,
    "catmullrom",
    0.5
  );
};

/**
 * One stitch, ready to be instanced.
 *
 * Segment counts are deliberately modest: this is drawn thousands of times, so
 * the triangle budget per stitch matters more than its silhouette.
 */
export const createStitchGeometry = (): THREE.BufferGeometry => {
  const geometry = new THREE.TubeGeometry(
    stitchCurve(),
    14,
    adjacentStitchDistance * 0.27,
    6,
    false
  );
  geometry.computeVertexNormals();
  return geometry;
};

/** A rough guide to how much space one stitch occupies, for camera framing. */
export const stitchSize = {
  width: adjacentStitchDistance,
  height: verticalStitchDistance,
};
