import { StitchType } from "../types/StitchType";

/*
 * The decrease marks, in one place.
 *
 * The screen chart drew these with rotated one-pixel borders and the exported
 * SVG with paths, so the same stitch had two different symbols: three legs on
 * screen, two on paper. Three is the right answer - see the s2kp mark below -
 * but the screen version was not centred, because its offsets were hand tuned
 * against a ten pixel cell: the apex sat half a pixel left of the middle, with
 * twice as much room above it as below. Both charts now draw from here.
 */

/** How far the mark keeps clear of the cell's edges, as a fraction of a cell. */
const inset = 0.2;

/** Stroke width as a fraction of a cell, so a ten pixel cell gets one pixel. */
export const markStrokeFraction = 0.1;

/** Trims the float noise that scaling a fraction leaves in the path data. */
const round = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * Path data for a decrease mark, in a cell of `size` whose top left corner is
 * at (`x`, `y`). Undefined for the stitches that carry no mark.
 *
 * Both marks are symmetric about the middle of the cell - the chevron's apex
 * sits on it, and the diagonal runs corner to corner through it - so they land
 * square in the box whatever the cell size.
 */
export const stitchMarkPath = (
  type: StitchType,
  x = 0,
  y = 0,
  size = 1
): string | undefined => {
  const left = round(x + inset * size);
  const right = round(x + (1 - inset) * size);
  const top = round(y + inset * size);
  const bottom = round(y + (1 - inset) * size);
  const middle = round(x + size / 2);

  // A right-leaning stroke, the usual mark for "knit two together".
  if (type === "k2tog") return `M${left} ${bottom}L${right} ${top}`;
  /*
   * The centred double decrease, s2kp: a chevron with a leg down the middle.
   *
   * Three legs, not two. Two would be the mark for a decrease that leans, and
   * this one does not - the middle stitch finishes on top and the leg says so.
   */
  if (type === "k3tog") {
    return (
      `M${left} ${bottom}L${middle} ${top}L${right} ${bottom}` +
      `M${middle} ${top}L${middle} ${bottom}`
    );
  }
  return undefined;
};
