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
 * How much of the frame the hat should fill.
 *
 * Deliberately short of the edges. The height is predicted rather than
 * measured and the fit is out by up to a tenth on the squattest hats, so the
 * margin has to cover that: a hat a tenth taller than predicted still lands
 * inside the frame, and one a tenth shorter still fills most of it.
 */
const fillFraction = 0.88;

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
    // The hat stands on the ground, so its middle is half its height up.
    centre.set(0, shape.height / 2, 0);

    samplePoints[0].set(0, shape.height, 0);
    compass.forEach(([dx, dz], index) => {
      samplePoints[index + 1].set(dx * shape.radius, 0, dz * shape.radius);
    });

    /** Puts the camera at `distance` and reports how much of the frame it fills. */
    const fillAt = (distance: number): number => {
      perspective.position.copy(centre).addScaledVector(direction, distance);
      perspective.lookAt(centre);
      perspective.near = Math.max(distance / 100, 0.1);
      perspective.far = distance * 8;
      perspective.updateProjectionMatrix();
      perspective.updateMatrixWorld();

      let widest = 0;
      for (const point of samplePoints) {
        projected.copy(point).project(perspective);
        widest = Math.max(widest, Math.abs(projected.x), Math.abs(projected.y));
      }
      return widest;
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

    for (let pass = 0; pass < 8; pass++) {
      const fill = fillAt(distance);
      if (fill <= 0) break;
      if (Math.abs(fill - fillFraction) < 0.015) break;
      distance *= fill / fillFraction;
    }
    fillAt(distance);

    const orbit = controls.current;
    if (orbit) {
      orbit.target.copy(centre);
      orbit.update();
    }
  }, [shape, camera, controls, viewport.width, viewport.height]);

  return null;
};

export default FrameHat;
