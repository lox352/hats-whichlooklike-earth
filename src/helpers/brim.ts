import type { RGB } from "../types/RGB";
import type { Point } from "../types/Point";
import type { Stitch } from "../types/Stitch";

/**
 * The brim: a band of k2, p2 rib at the hat's edge, knitted first. It is
 * worked over fewer stitches than the hat and on needles two sizes smaller,
 * so it hugs the head and the hat above it does not, and its last round is
 * knitted plain, making stitches between to bring the count up to the hat's.
 * Then the needles change, the hat's yarns join, and the picture begins.
 *
 * That is how a beanie is commonly made: rib on needles a size or two below
 * the body's, over about a tenth fewer stitches, ending in a round that
 * increases evenly. The ratio varies between patterns; a tenth is the usual
 * one for a fitted hat, and the rib takes a multiple of four.
 *
 * The brim is no part of the picture. Only the hat above it is projected
 * onto the earth (see pictureOf), as the whole hat was before it had a brim,
 * so a brim changes how much hat there is and not what the hat shows.
 */

/** How many stitches the brim's rib is cast on with, for a hat of this many. */
export const brimStitchesFor = (stitchesPerRow: number): number => {
  const rib = Math.round((stitchesPerRow * 0.9) / 4) * 4;
  // Fewer than the hat's, always, or there is nothing to increase; and enough to rib.
  const fewer = rib < stitchesPerRow ? rib : Math.floor((stitchesPerRow - 1) / 4) * 4;
  return Math.max(fewer, 8);
};

/**
 * Needle sizes as they are sold, in millimetres: the metric sizes of the US
 * ladder, which is what "two sizes smaller" is counted on.
 */
export const needleSizes = [2, 2.25, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.5, 5, 5.5, 6, 6.5, 7, 8, 9, 10];

/** The needles a double-knit wool is knitted on at this site's own gauge (see sizing). */
export const defaultNeedles = 4;

/** The needles for a brim under a hat knitted on these: two sizes smaller. */
export const brimNeedlesFor = (needles: number): number => {
  const at = needleSizes.findIndex((size) => size >= needles - 1e-9);
  if (at < 0) return needles - 1;
  return needleSizes[Math.max(at - 2, 0)];
};

/** A beanie's brim, unfolded, in centimetres. */
export const defaultBrimDepth = 5;

/** A brim needs a cast-on, a round of rib at least, and the round that increases. */
export const minimumBrimRounds = 3;

/** Rounds for a brim this deep at this many rounds to 10cm; 0 for no brim. */
export const brimRoundsFor = (depth: number, rowsPer10cm: number): number => {
  if (!(depth > 0) || !(rowsPer10cm > 0)) return 0;
  return Math.max(Math.round((depth / 10) * rowsPer10cm), minimumBrimRounds);
};

/** White, as a brim is unless chosen otherwise. */
export const defaultTrim: RGB = [255, 255, 255];

/** A brim, as a hat is made with one. */
export interface Brim {
  /** Rounds of it in all: the cast-on, the rib, and the round that increases. */
  rounds: number;
  /** The needles it is knitted on, in millimetres. */
  needles: number;
  colour: RGB;
}

export const isBrim = (stitch: Pick<Stitch, "brim">): boolean => stitch.brim === true;

/** How many of a hat's stitches are its brim's: all of them before the picture begins. */
export const brimStitchCount = (stitches: Pick<Stitch, "brim">[]): number => {
  let count = 0;
  while (count < stitches.length && stitches[count].brim) count++;
  return count;
};

/**
 * How many stitches a round of the hat above its brim has: the first stitch
 * above it is worked into the first of the brim's last round, which has as
 * many. Undefined for a hat with no brim.
 */
export const hatRoundOf = (stitches: Pick<Stitch, "id" | "links" | "brim">[]): number | undefined => {
  const brim = brimStitchCount(stitches);
  const first = stitches[brim];
  if (brim === 0 || !first || first.links.length < 2) return undefined;
  return first.id - first.links[0];
};

/**
 * The part of the hat its picture is projected onto - everything above the
 * brim - and where each of those stitches is, moved down so the brim's top
 * is where a hat with no brim would begin: the first round above the brim
 * sitting at the foot, as a cast-on does. Each id is the hat's own.
 */
export const pictureOf = (stitches: Stitch[], positions: Point[]): { ids: number[]; positions: Point[] } => {
  const ids = stitches.filter((stitch) => !stitch.brim).map((stitch) => stitch.id);
  const brim = stitches.length - ids.length;
  if (brim === 0) return { ids, positions: ids.map((id) => positions[id]) };
  const round = ids.slice(0, Math.max(hatRoundOf(stitches) ?? 1, 1));
  const foot = round.reduce((sum, id) => sum + positions[id].y, 0) / round.length;
  return { ids, positions: ids.map((id) => ({ ...positions[id], y: positions[id].y - foot })) };
};
