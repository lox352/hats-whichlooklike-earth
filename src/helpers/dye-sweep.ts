import { Point } from "../types/Point";

/**
 * The dye sweep: which stitches take colour when.
 *
 * The earth arrives as a wave running down from the crown rather than
 * appearing everywhere at once. Each stitch gets a position in that wave, and
 * then fades in over its own short window.
 *
 * Kept separate from the renderer so it can be reasoned about and tested
 * without a WebGL context.
 */

/**
 * Fraction of the sweep each stitch takes to fade in. The rest of the sweep is
 * the wave travelling, so this also sets how soft the leading edge looks.
 */
export const dyeFadeWindow = 0.2;

/**
 * When each stitch starts taking colour, in 0..1, from its height.
 *
 * The highest stitch starts at 0 and the lowest at `1 - dyeFadeWindow`, so
 * the last stitch to start still has room to finish inside the sweep.
 */
export const dyeOrderFromHeights = (heights: number[]): Float32Array => {
  const order = new Float32Array(heights.length);
  if (heights.length === 0) return order;

  let highest = -Infinity;
  let lowest = Infinity;
  for (const height of heights) {
    if (!Number.isFinite(height)) continue;
    if (height > highest) highest = height;
    if (height < lowest) lowest = height;
  }
  if (!Number.isFinite(highest) || !Number.isFinite(lowest)) return order;

  const span = highest - lowest;
  const latest = 1 - dyeFadeWindow;

  for (let i = 0; i < heights.length; i++) {
    const height = heights[i];
    if (!Number.isFinite(height) || span === 0) {
      order[i] = 0;
      continue;
    }
    order[i] = ((highest - height) / span) * latest;
  }
  return order;
};

/**
 * How dyed one stitch is, 0 to 1, given how far the sweep has gone and where
 * that stitch sits in it. Smoothstep, so the leading edge has no hard line.
 *
 * The tolerance matters: offsets are held in a Float32Array for the instanced
 * renderer, so an offset of 0.8 comes back as 0.800000011920929. Without it,
 * the last stitch to start would stop a hair short of full colour and stay
 * faintly pale for good.
 */
const essentiallyDone = 1 - 1e-4;

export const dyeAmount = (progress: number, offset: number): number => {
  if (!Number.isFinite(progress) || !Number.isFinite(offset)) return 0;
  const raw = (progress - offset) / dyeFadeWindow;
  if (raw >= essentiallyDone) return 1;
  const local = Math.min(Math.max(raw, 0), 1);
  return local * local * (3 - 2 * local);
};

/** Heights of a set of stitch positions, for dyeOrderFromHeights. */
export const heightsOf = (positions: (Point | undefined)[]): number[] =>
  positions.map((position) => position?.y ?? 0);
