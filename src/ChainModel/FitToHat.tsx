import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface HatBounds {
  min: THREE.Vector3;
  max: THREE.Vector3;
  valid: boolean;
}

/** The bit of OrbitControls this needs, without depending on drei's types. */
export interface OrbitLike {
  target: THREE.Vector3;
  update: () => void;
}

interface FitToHatProps {
  /** Updated every frame by StitchInstances, which already reads every body. */
  bounds: React.MutableRefObject<HatBounds>;
  /** Refit when this changes: while knitting, and once it settles. */
  settled: boolean;
  /**
   * The orbit controls, passed rather than read from the store. They own the
   * camera once enabled and recentre it on their target every frame, so the
   * target has to move with the camera or the fit is undone immediately.
   */
  controls: React.MutableRefObject<OrbitLike | null>;
}

const centre = new THREE.Vector3();
const size = new THREE.Vector3();
const projected = new THREE.Vector3();
const direction = new THREE.Vector3();
/*
 * Points that bound the hat's silhouette: the crown, and the brim ring at
 * eight compass points.
 *
 * Not the bounding box's corners. A hat is a dome, so the box's top corners
 * are empty air above the brim and sit further from the centre than any real
 * stitch, which shrank the hat to about two thirds of the frame.
 */
const samplePoints = Array.from({ length: 9 }, () => new THREE.Vector3());
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

/**
 * Frames the camera on the hat that is actually there.
 *
 * The framing used to be derived from the stitch and row counts, which only
 * agreed with the finished hat at the counts it happened to be tuned at: a
 * 160-stitch hat came out taller than the guess and hung out of the view. This
 * measures the settled bounding box instead, so any stitch count is centred
 * and fits.
 */
const FitToHat: React.FC<FitToHatProps> = ({ bounds, settled, controls }) => {
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.size);
  const fitted = useRef("");
  const pending = useRef(true);

  // Ask for a refit when the hat changes state or the stage is resized.
  useEffect(() => {
    pending.current = true;
  }, [settled, viewport.width, viewport.height]);

  /*
   * Done in a frame rather than an effect: the bounds are only filled in once
   * the instanced renderer has run, which is after the effects for that render
   * have already fired.
   */
  useFrame(() => {
    if (!pending.current || !bounds.current.valid) return;

    const key = `${settled}:${viewport.width}x${viewport.height}`;
    pending.current = false;
    if (fitted.current === key) return;
    fitted.current = key;

    const { min, max } = bounds.current;
    centre.addVectors(min, max).multiplyScalar(0.5);
    size.subVectors(max, min);
    if (size.length() < 1e-4) return;

    const perspective = camera as THREE.PerspectiveCamera;
    const orbit = controls.current;

    // Keep the direction the camera is already looking from, just move it.
    direction.copy(perspective.position).sub(orbit?.target ?? centre);
    if (direction.lengthSq() < 1e-6) direction.set(-0.8, 0.35, 0.5);
    direction.normalize();

    const halfX = size.x / 2;
    const halfZ = size.z / 2;
    samplePoints[0].set(centre.x, max.y, centre.z);
    compass.forEach(([dx, dz], index) => {
      samplePoints[index + 1].set(
        centre.x + dx * halfX,
        min.y,
        centre.z + dz * halfZ
      );
    });

    /**
     * Puts the camera at `candidate` and reports the hat's projected extent:
     * how much of the frame it fills, and where its middle sits vertically.
     */
    const fillAt = (candidate: number): { fill: number; offsetY: number } => {
      perspective.position.copy(centre).addScaledVector(direction, candidate);
      perspective.lookAt(centre);
      perspective.near = Math.max(candidate / 100, 0.1);
      perspective.far = candidate * 8;
      perspective.updateProjectionMatrix();
      perspective.updateMatrixWorld();

      let widest = 0;
      let lowest = Infinity;
      let highest = -Infinity;
      for (const point of samplePoints) {
        projected.copy(point).project(perspective);
        widest = Math.max(widest, Math.abs(projected.x), Math.abs(projected.y));
        lowest = Math.min(lowest, projected.y);
        highest = Math.max(highest, projected.y);
      }
      return { fill: widest, offsetY: (highest + lowest) / 2 };
    };

    /*
     * Fit by projecting the hat's own corners rather than treating it as a
     * flat plane at the centre distance.
     *
     * A hat is about as deep as it is wide, so its near surface sits far
     * closer to the camera than its centre does and is magnified accordingly.
     * Sizing from the centre plane put a 160-stitch hat at roughly two and a
     * half times the height of the frame.
     *
     * The bounding-sphere distance always fits, so start there and tighten.
     */
    const fovRadians = (perspective.fov * Math.PI) / 180;
    // The bounding sphere always fits, so start there and tighten.
    let distance = size.length() / 2 / Math.sin(fovRadians / 2);

    /*
     * Aim at the middle of the hat and step back until it fills the frame.
     *
     * An earlier version also tried to recentre on the projected silhouette,
     * since a dome's projected middle sits a little below the middle of its
     * bounding box. It made things worse: the offset is measured in screen
     * space but was applied along world Y, and the camera looks down at an
     * angle, so the two do not line up and each pass overshot the last.
     */
    const wanted = 0.92;
    for (let pass = 0; pass < 8; pass++) {
      const { fill } = fillAt(distance);
      if (fill <= 0) break;
      if (Math.abs(fill - wanted) < 0.015) break;
      distance *= fill / wanted;
    }
    fillAt(distance);

    if (orbit) {
      orbit.target.copy(centre);
      orbit.update();
    }
  });

  return null;
};

export default FitToHat;
