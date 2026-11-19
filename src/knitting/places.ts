import type { Stitch as HatStitch } from "../types/Stitch";
import type { HatKnitting } from "./hat-knitting";
import type { ChartOverlay } from "../ui/chart/chart-painter";
import { isStep } from "../pattern/Stitch";

/**
 * Where on Earth a stitch of the knitting lands, as the chart and the
 * knitting panel ask it: by the knitting's ids, which run one past the hat's
 * own after the join (see hat-knitting).
 */
export const regionAt = (hat: HatStitch[], knitting: HatKnitting, id: number): string | undefined => {
  const own = knitting.hatIdOf(id);
  return own === undefined ? undefined : hat[own]?.region;
};

/** The next stitch to knit after `progress`, past any step. */
export const nextStitch = (knitting: HatKnitting, progress: number): number | undefined => {
  let id = progress + 1;
  while (knitting.stitches[id] && isStep(knitting.stitches[id])) id++;
  return knitting.stitches[id] ? id : undefined;
};

/**
 * One place drawn round on the chart, as the hat's chart always has: the
 * country or ocean you are knitting through, or the one a stitch tapped is
 * in, wherever its stitches fall.
 */
export const placeOutline = (
  hat: HatStitch[],
  knitting: HatKnitting,
  key: string,
  colours: { ink: string; halo: string },
): ChartOverlay["outline"] => ({ has: (id) => regionAt(hat, knitting, id) === key, ...colours });

