import { describe, expect, it } from "vitest";
import {
  minimumSettleFrames,
  restMotionThreshold,
  settleDamping,
  settleStepBudgetMs,
  settleSubsteps,
  settleTimeStep,
  solverIterations,
} from "./constants";

/**
 * These are not arbitrary: each was measured against the settled height of a
 * default hat. This guards the two that are tempting to "optimise" and that
 * visibly break the hat when lowered.
 */
describe("settle tuning", () => {
  it("keeps enough solver iterations for the rope joints to hold", () => {
    // At 10 iterations the ropes creep: the hat never reaches equilibrium and
    // ends up ~6% too tall, still climbing when the rest test fires. At 4 it
    // is ~17% too tall.
    expect(solverIterations).toBeGreaterThanOrEqual(20);
  });

  it("keeps the time step small enough that the hat does not over-inflate", () => {
    // 0.2 settled ~2.6% high; 0.15 stays within ~1.4%.
    expect(settleTimeStep).toBeLessThanOrEqual(0.15);
    expect(settleTimeStep).toBeGreaterThan(0);
  });

  it("damps near critical: enough to stop the ringing, not so much it crawls", () => {
    expect(settleDamping).toBeGreaterThan(1);
    expect(settleDamping).toBeLessThanOrEqual(6);
  });

  it("steps at least once per frame, and stays watchable", () => {
    expect(settleSubsteps).toBeGreaterThanOrEqual(1);
    // Batching does not reduce total time, it only trades away rendered
    // frames, so a large value buys nothing and makes the settle a slideshow.
    expect(settleSubsteps).toBeLessThanOrEqual(4);
  });

  it("has a per-frame budget that cannot stall the page for long", () => {
    expect(settleStepBudgetMs).toBeGreaterThan(0);
    expect(settleStepBudgetMs).toBeLessThanOrEqual(500);
  });

  it("tests for rest strictly, and not before the hat has moved", () => {
    expect(restMotionThreshold).toBeGreaterThan(0);
    // The value this replaced was 0.6, which stopped the hat while it was
    // still visibly rising once damping was raised.
    expect(restMotionThreshold).toBeLessThanOrEqual(0.2);
    expect(minimumSettleFrames).toBeGreaterThanOrEqual(5);
  });
});
