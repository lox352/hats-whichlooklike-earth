import { GlobalCoordinates } from "./types/GlobalCoordinates";

const adjacentStitchDistance = 2;
const verticalStitchDistance = 1.6;

const defaultStitchesPerRow = 160;
const defaultNumberOfRows = 35;

/**
 * Settle tuning.
 *
 * The wait between "Knit and Dye" and a dyed hat is the simulation reaching
 * equilibrium, and its cost is
 *
 *   (simulated seconds to settle / timeStep) x cost of one step
 *
 * Rapier's own loop ties simulated time to real elapsed time in both of its
 * timeStep modes, so the wait cannot be shortened by making frames cheaper.
 * These three numbers are the levers, and each was measured:
 *
 * - Damping. The hat used to be badly underdamped: it collapsed, re-inflated,
 *   overshot and then rang for about ten seconds. Damping does not change
 *   where the hat ends up, only how long it takes to get there, which was
 *   confirmed by running to a very tight rest threshold at two damping values
 *   and getting the same height. This value is near critical, so the hat rises
 *   smoothly and stops.
 * - Time step. Larger steps mean fewer of them, but the rope joints are only
 *   approximately enforced per step, so too large a step lets the hat
 *   over-inflate. 0.15 was the largest that stayed within ~1% of the settled
 *   height.
 * - Solver iterations. This is the per-step cost, but dropping it is what
 *   breaks the hat: at 10 iterations the ropes creep and the hat never reaches
 *   equilibrium at all, ending up 6% too tall and still climbing. Left alone.
 */
const settleDamping = 3;
const settleTimeStep = 0.15;
const solverIterations = 20;

/**
 * How many times to advance the world per rendered frame while settling.
 *
 * This does not change the total time, since the physics cost is the same
 * however it is batched; it trades animation smoothness against the render
 * cost. Low enough to keep the hat's rise watchable.
 */
const settleSubsteps = 2;

/**
 * Per-frame budget for those steps, so a slow machine drops substeps rather
 * than locking the page up.
 */
const settleStepBudgetMs = 250;

/**
 * Mean per-stitch motion below which the hat counts as settled. Tighter than
 * the value this replaced, and still reached sooner, because the motion now
 * decays instead of oscillating. Verified converged: tightening it further
 * changes the settled height by less than 0.1%.
 */
const restMotionThreshold = 0.15;

/** Always simulate at least this many frames before testing for rest. */
const minimumSettleFrames = 10;

/**
 * How long the dye takes to sweep down the hat, in seconds.
 *
 * Long enough to read as the earth arriving rather than a flicker, short
 * enough not to hold up someone who just wants the chart.
 */
const dyeSweepSeconds = 1.5;

/**
 * Largest frame delta the dye sweep will advance by, in seconds.
 *
 * Colouring the hat blocks for a few hundred milliseconds, and the frame
 * straight afterwards carries that whole stall as its delta. Advancing the
 * sweep by it skips most of the animation in one step, and on a slow machine
 * skips all of it. Clamping means the sweep is measured in frames of visible
 * motion rather than in wall-clock time it may never get to spend.
 */
const maxDyeStepSeconds = 1 / 30;

const northPole: GlobalCoordinates = { latitude: 90, longitude: 0 };
const southPole: GlobalCoordinates = { latitude: -90, longitude: 180 };

export {
  adjacentStitchDistance,
  verticalStitchDistance,
  defaultStitchesPerRow,
  defaultNumberOfRows,
  settleDamping,
  settleTimeStep,
  settleSubsteps,
  settleStepBudgetMs,
  solverIterations,
  restMotionThreshold,
  minimumSettleFrames,
  dyeSweepSeconds,
  maxDyeStepSeconds,
  northPole,
  southPole,
};
