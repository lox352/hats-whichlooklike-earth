import { StitchType } from "../types/StitchType";

/*
 * The decrease marks, in one place.
 *
 * The screen chart drew these with rotated one-pixel borders and the exported
 * SVG with paths, so the same stitch had two different symbols: a fan of three
 * lines on screen, a chevron on paper. And the screen one was not quite
 * centred - its apex sat half a pixel left of the middle of the cell, and it
 * left twice as much room above as below - because the offsets were hand
 * tuned against a ten pixel cell. Both charts now draw from here.
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
  // A chevron: three stitches converging into one.
  if (type === "k3tog") {
    return `M${left} ${bottom}L${middle} ${top}L${right} ${bottom}`;
  }
  return undefined;
};
