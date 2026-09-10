import { useRapier } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import {
  settleStepBudgetMs,
  settleSubsteps,
  settleTimeStep,
} from "../constants";

/**
 * Drives the physics world while the hat is settling.
 *
 * Rapier's Physics component is left paused so it never steps on its own. Its
 * two built-in modes both derive the step from real elapsed time — "vary" uses
 * the frame delta directly, and a fixed timeStep runs an accumulator against
 * the clock — which means the number of steps taken depends on how fast the
 * machine renders. Stepping here instead gives the same simulation on every
 * machine.
 *
 * step() comes from the Rapier context and does the world step and the mesh
 * sync together, so the stitches follow along as they move.
 */
const Settler: React.FC<{ active: boolean }> = ({ active }) => {
  const { step } = useRapier();

  useFrame(() => {
    if (!active) return;
    const deadline = performance.now() + settleStepBudgetMs;
    for (let i = 0; i < settleSubsteps; i++) {
      step(settleTimeStep);
      if (performance.now() > deadline) break;
    }
  });

  return null;
};

export default Settler;
