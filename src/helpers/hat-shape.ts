import { Stitch } from "../types/Stitch";
import { verticalStitchDistance } from "../constants";
import { indexRows } from "./knitting-progress";

/**
 * How big the hat will be once it has settled, worked out before it has.
 *
 * The camera needs this up front. Framing from the hat's measured bounds meant
 * moving the camera when the shape changed, and any movement there reads badly:
 * either a jump, or an ease that fights you if you try to turn the hat while it
 * is still going.
 *
 * Two of the three numbers are exact rather than predicted:
 *
 *  - The radius is the cast-on circle, taken straight from the stitches. The
 *    cast-on row is pinned in place and is the widest part of the hat, so this
 *    is not an estimate.
 *  - The row count comes from the chart layout, so it counts the crown's rows
 *    as well as the body's.
 *
 * Only the height is predicted, and it has to be: how far the tube inflates is
 * the result of the simulation. See settledHeight.
 */

export interface HatShape {
  /** Distance from the axis to the brim. */
  radius: number;
  /** Brim to crown, in the same units as the stitch positions. */
  height: number;
  rows: number;
}

/**
 * How tall the hat settles, as a fraction of the fabric it is made from.
 *
 * Fitted to 24 measured pyramidal hats, from 60 to 200 stitches and 10 to 45
 * rows, and checked against three rounded-crown ones it was not fitted to. The
 * useful move is to work in ratios rather than absolute sizes: plotting height
 * over fabric length against radius over fabric length collapses every one of
 * those hats onto a single curve, because what decides how far a tube inflates
 * is its proportions, not its size.
 *
 * The curve is
 *
 *   height / L = 1 - 0.781 * (radius / L)^2,  L = row height * rows
 *
 * which is within 5% of every hat in the set except the two squattest, and
 * within 3.7% on average. Those two are 160 and 200 stitches over only ten
 * rows, which is a disc rather than a hat: when the crown has less fabric than
 * its own radius it cannot reach the axis, and the physics then does something
 * this curve does not describe. The camera's margin covers them anyway.
 *
 * A free exponent fits no better than the square, so the square is what is
 * used. settled-hat-measurements.json holds the data and a test checks the fit
 * against it, so a change to the physics or the shaping that moves the real
 * hats will fail rather than quietly mis-frame them.
 */
const inflationCoefficient = 0.781;

/**
 * Beyond this ratio the fit would predict a hat of no height at all. It
 * corresponds to a tube far wider than it is long, which is not a hat anyone
 * will knit, but the camera still has to be pointed somewhere.
 */
const widestUsefulRatio = 1.1;

export const settledHeight = (radius: number, rows: number): number => {
  const fabricLength = verticalStitchDistance * Math.max(rows, 1);
  if (fabricLength <= 0) return 0;
  const ratio = Math.min(Math.max(radius / fabricLength, 0), widestUsefulRatio);
  const fraction = Math.max(1 - inflationCoefficient * ratio * ratio, 0.05);
  return fabricLength * fraction;
};

/** Radius of the cast-on circle: the fixed stitches at the start of the hat. */
export const castOnRadius = (stitches: Stitch[]): number => {
  let widest = 0;
  for (const stitch of stitches) {
    // The cast-on row and the join are the fixed ones; past those the hat is
    // free to move and its positions are only a starting guess.
    if (!stitch.fixed) break;
    const { x, z } = stitch.position;
    const distance = Math.hypot(x, z);
    if (distance > widest) widest = distance;
  }
  return widest;
};

export const predictHatShape = (stitches: Stitch[]): HatShape => {
  if (stitches.length === 0) return { radius: 1, height: 1, rows: 0 };

  const rows = Math.max(indexRows(stitches).totalRows, 1);
  const radius = Math.max(castOnRadius(stitches), 0.001);
  return { radius, height: settledHeight(radius, rows), rows };
};
