import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HatShape } from "../helpers/hat-shape";

/** The bit of OrbitControls this needs, without depending on drei's types. */
export interface OrbitLike {
  target: THREE.Vector3;
  update: () => void;
}

interface FrameHatProps {
  /** Worked out before the hat settles. See helpers/hat-shape. */
  shape: HatShape;
  controls: React.MutableRefObject<OrbitLike | null>;
}

const centre = new THREE.Vector3();
const projected = new THREE.Vector3();
const direction = new THREE.Vector3(-0.78, 0.34, 0.52).normalize();

/*
 * Points that bound the hat's silhouette: the crown, and the brim ring at
 * eight compass points.
 *
 * Not a bounding box's corners. A hat is a dome, so a box's top corners are
 * empty air above the brim and sit further from the centre than any real
 * stitch, which shrinks the hat to about two thirds of the frame.
 */
const compass = [
  [1, 0],
  [0.7071, 0.7071],
  [0, 1],
  [-0.7071, 0.7071],
  [-1, 0],
  [-0.7071, -0.7071],
  [0, -1],
  [0.7071, -0.7071],
];
const samplePoints = Array.from({ length: 9 }, () => new THREE.Vector3());

/**
 * How much of the frame the hat's silhouette should fill, measured from its
 * middle, where 1 reaches the edge.
 *
 * Deliberately short of the edges. The height is predicted rather than
 * measured and the fit is out by up to a tenth on the squattest hats, so the
 * margin has to cover that: a hat a tenth taller than predicted still lands
 * inside the frame, and one a tenth shorter still fills most of it.
 */
const fillFraction = 0.72;

/** Where the middle of the silhouette should sit. 0 is the middle of the frame. */
const framingBias = 0;

/**
 * Places the camera once, from the size the hat is going to be, and then leaves
 * it alone.
 *
 * It used to frame the hat from its measured bounds, which meant moving the
 * camera when the shape changed. Every version of that movement was wrong in
 * some way: snapping was a jolt, and easing fought the user, because the ease
 * ran towards a fixed point while the auto-rotation carried the camera away
 * from it, so the "close enough" test never passed and the pull never stopped.
 * That is what made the hat feel elastic when you tried to turn it.
 *
 * So nothing moves the camera now except the person using it.
 */
const FrameHat: React.FC<FrameHatProps> = ({ shape, controls }) => {
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.size);
  const framed = useRef("");

  useEffect(() => {
    const key = `${shape.radius.toFixed(2)}:${shape.height.toFixed(
      2
    )}:${viewport.width}x${viewport.height}`;
    if (framed.current === key) return;
    framed.current = key;

    const perspective = camera as THREE.PerspectiveCamera;

    samplePoints[0].set(0, shape.height, 0);
    compass.forEach(([dx, dz], index) => {
      samplePoints[index + 1].set(dx * shape.radius, 0, dz * shape.radius);
    });

    /**
     * Aims the camera at `aimY` from `distance` away, and reports where the
     * silhouette lands: how far it reaches from its own middle, and where that
     * middle sits up the frame.
     */
    const placeAt = (distance: number, aimY: number) => {
      centre.set(0, aimY, 0);
      perspective.position.copy(centre).addScaledVector(direction, distance);
      perspective.lookAt(centre);
      perspective.near = Math.max(distance / 100, 0.1);
      perspective.far = distance * 8;
      perspective.updateProjectionMatrix();
      perspective.updateMatrixWorld();

      let top = -Infinity;
      let bottom = Infinity;
      let left = Infinity;
      let right = -Infinity;
      for (const point of samplePoints) {
        projected.copy(point).project(perspective);
        top = Math.max(top, projected.y);
        bottom = Math.min(bottom, projected.y);
        left = Math.min(left, projected.x);
        right = Math.max(right, projected.x);
      }
      return {
        reach: Math.max((top - bottom) / 2, (right - left) / 2),
        middle: (top + bottom) / 2,
      };
    };

    /*
     * Step back until it fits, starting from a distance that always does.
     *
     * Sizing this as if the hat were a flat plane at its centre does not work:
     * a hat is about as deep as it is wide, so its near face is much closer to
     * the camera than its centre and is magnified accordingly. That put a
     * 160-stitch hat at two and a half times the height of the frame.
     */
    const fovRadians = (perspective.fov * Math.PI) / 180;
    const boundingRadius = Math.hypot(shape.radius, shape.height / 2);
    let distance = boundingRadius / Math.sin(fovRadians / 2);
    // The hat stands on the ground, so its middle is half its height up.
    let aimY = shape.height / 2;

    /*
     * Then settle the size and the height together.
     *
     * Aiming at the hat's own middle does not put it in the middle of the
     * frame. The camera looks slightly down at it, so the near edge of the brim
     * is both the lowest thing on screen and the closest thing to the lens,
     * which pushes it further down than the crown reaches up. Measured, that
     * left a quarter of the frame empty above the hat and a fourteenth below
     * it. So the aim point is fitted rather than assumed.
     *
     * An earlier attempt at this went wrong by nudging the camera along world Y
     * by the screen-space error as if the two were the same length. They are
     * not, on either count: a world-Y move only partly shows up as vertical
     * movement on screen, because the rest of it goes into depth, and the
     * frame is two units of clip space tall. Hence the conversion below.
     */
    const tangentOfHalfFov = Math.tan(fovRadians / 2);
    const shareShowingOnScreen = Math.sqrt(1 - direction.y * direction.y);

    for (let pass = 0; pass < 8; pass++) {
      const { reach, middle } = placeAt(distance, aimY);
      if (reach <= 0) break;
      const offset = middle - framingBias;
      if (Math.abs(reach - fillFraction) < 0.01 && Math.abs(offset) < 0.01) {
        break;
      }
      // Raising the aim point pushes the hat down the frame, so lifting the hat
      // means dropping the whole rig.
      aimY += (offset * distance * tangentOfHalfFov) / shareShowingOnScreen;
      distance *= reach / fillFraction;
    }
    placeAt(distance, aimY);

    const orbit = controls.current;
    if (orbit) {
      orbit.target.copy(centre);
      orbit.update();
    }
  }, [shape, camera, controls, viewport.width, viewport.height]);

  return null;
};

export default FrameHat;
