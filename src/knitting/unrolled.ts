import type { Stitch as HatStitch } from "../types/Stitch";
import type { HatKnitting } from "./hat-knitting";

/**
 * The hat's picture unrolled into a rectangle: every round stretched across
 * the full width, the cast-on at the foot and the crown at the top, each
 * stitch at its own longitude round the settled hat and reaching half way to
 * its neighbours either side, so a round is covered edge to edge with nothing
 * left between. The crown's decreases, which leave the chart ragged, close up,
 * and what is left is the map the hat is a picture of.
 *
 * Seen from outside the hat, as anyone looks at one, so east is to the right.
 *
 * A brim is left off: it is no part of the picture (see helpers/brim), and
 * its rounds would read as a band of whatever colour the trim is.
 */

export interface UnrolledStitch {
  /** The knitting's id for it. */
  id: number;
  /** Where it begins and ends across the picture, as fractions of its width; `to` may pass 1, and wraps round. */
  from: number;
  to: number;
  slot: string;
}

const turn = (fraction: number) => ((fraction % 1) + 1) % 1;

export const unrolled = (hat: HatStitch[], knitting: HatKnitting): UnrolledStitch[][] =>
  knitting.rounds
    .filter((ids) => !ids.every((id) => hat[knitting.hatIdOf(id) ?? -1]?.brim))
    .map((ids) => {
    const placed = ids
      .map((id) => {
        const own = knitting.hatIdOf(id);
        const position = own === undefined ? undefined : hat[own]?.position;
        return position && { id, at: turn(-Math.atan2(position.z, position.x) / (2 * Math.PI)), slot: knitting.stitches[id].slot };
      })
      .filter((one): one is { id: number; at: number; slot: string } => one !== undefined)
      .sort((a, b) => a.at - b.at);
    const n = placed.length;
    if (n === 1) return [{ id: placed[0].id, from: 0, to: 1, slot: placed[0].slot }];
    return placed.map((one, k) => {
      const previous = k === 0 ? placed[n - 1].at - 1 : placed[k - 1].at;
      const next = k === n - 1 ? placed[0].at + 1 : placed[k + 1].at;
      return { id: one.id, from: (one.at + previous) / 2, to: (one.at + next) / 2, slot: one.slot };
    });
  });
