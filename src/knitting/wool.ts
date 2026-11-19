import type { Stitch } from "../pattern/Stitch";
import { isFabric } from "../pattern/Stitch";
import { metresBySlot } from "../reading/yardage";
import { defaultGauge } from "../helpers/sizing";

/**
 * How much of each yarn a hat takes, estimated from its stitches as Sweat
 * Shop estimates a jumper's: a length of yarn in every stitch, and the yarn
 * not in use carried behind it as a float, with a tenth more for the tails.
 *
 * Its lengths are for Shetland jumper weight at 28 stitches to 10cm; a hat
 * here is knitted in double knitting at the site's gauge, whose stitches are
 * that much wider, and so take that much more yarn.
 */
const heavier = 28 / defaultGauge.stitchesPer10cm;

export interface WoolNeeded {
  slot: string;
  metres: number;
  stitches: number;
}

export const woolNeeded = (stitches: Stitch[], rounds: number[][]): WoolNeeded[] => {
  const metres = metresBySlot(stitches, rounds);
  const counts = new Map<string, number>();
  for (const stitch of stitches) if (isFabric(stitch)) counts.set(stitch.slot, (counts.get(stitch.slot) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slot, count]) => ({ slot, stitches: count, metres: (metres[slot] ?? 0) * heavier }));
};

/** "About 45m", to the nearest five, and never less than five. */
export const aboutMetres = (metres: number): string => `about ${Math.max(5, Math.ceil(metres / 5) * 5)}m`;
