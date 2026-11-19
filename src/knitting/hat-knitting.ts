import type { Stitch as HatStitch } from "../types/Stitch";
import type { Stitch } from "../pattern/Stitch";
import type { StitchType } from "../pattern/StitchType";
import type { SweaterStitches } from "../pattern/knitted";
import type { Piece } from "../pattern/design";
import { kinds } from "../pattern/kinds";
import { slotOf } from "./yarns";

/**
 * A hat as the knitting machinery reads it.
 *
 * The hat is made, settled and dyed as it always was (see KnittingMachine and
 * ChainModel): a list of stitches with a place in space, a colour and the
 * stitches each was knitted into. Everything that reads a pattern while it is
 * knitted - the chart, the knitting panel, the key, the written rounds, the
 * time it takes - is Sweat Shop's, which grew up out of this site and knows
 * more: what kind of stitch each is and what is not a stitch at all, which
 * round it is in, and how a decrease stands over the stitches it took. This
 * is the one place the two meet.
 *
 * What changes on the way:
 *
 * - **The cast-on.** The machine casts on a ring and closes it with a "join"
 *   stitch that the next round is knitted into, so the stitch called a join
 *   is really the last stitch cast on. Here it is that, and the join is a
 *   step of its own after it - part of the order of work, but no fabric -
 *   so joining the round is something the knitting panel tells you to do and
 *   counts as done, and every id after it is one more than the hat's.
 * - **The double decrease.** Saved patterns call it k3tog, which it never
 *   was: it is knitted, charted and written as a centred double decrease,
 *   slip two, knit one, pass the two over. Here it is that, an s2kp.
 * - **The yarn.** A stitch's yarn is a slot, a letter, as a pattern's key
 *   gives one (see yarns), so what a yarn is called and looks like stays
 *   yours to choose, and changing it never rebuilds the knitting.
 * - **The rounds.** The machine knits a helix and never says where one round
 *   ends. They are counted as the hat's chart has always counted its rows,
 *   so a round has the number it has on a chart printed before: round 1 is
 *   the cast-on, and a stitch is one round above the middle of the stitches
 *   it takes - a k2tog's first, an s2kp's centre. Each round follows the
 *   last without a gap. At the seam, where the helix comes round, a decrease
 *   ending a round can take the first stitch of that same round with it, as
 *   it does on the needles when a decrease is worked across the marker.
 */

export const hatPiece: Piece = { id: "hat", label: "Hat" };

export interface HatKnitting extends SweaterStitches {
  /** The hat's own stitch for each of these, by id, or undefined for the join, which the hat has no stitch for. */
  hatIdOf: (id: number) => number | undefined;
  /** This knitting's id for one of the hat's stitches. */
  idOfHat: (hatId: number) => number;
  /** The join step's id, if the hat was joined at all. */
  joinId?: number;
}

const typeOf = (type: HatStitch["type"]): StitchType =>
  type === "k3tog" ? "s2kp" : type === "k2tog" ? "k2tog" : "k1";

const built = new WeakMap<HatStitch[], HatKnitting>();

/** Where the hat's join is: the last stitch cast on. */
export const joinOf = (hatStitches: HatStitch[]): number | undefined => {
  const at = hatStitches.findIndex((stitch) => stitch.type === "join");
  return at < 0 ? undefined : hatStitches[at].id;
};

/**
 * Progress kept by the hat's own ids - as every saved pattern before
 * version 4 kept it - as this knitting counts it. A hat knitted past its join
 * has joined the round too.
 */
export const progressFromHat = (hatProgress: number, joinAt: number | undefined): number =>
  joinAt !== undefined && hatProgress >= joinAt ? hatProgress + 1 : hatProgress;

export const hatKnitting = (hatStitches: HatStitch[]): HatKnitting => {
  const kept = built.get(hatStitches);
  if (kept) return kept;

  const joinAt = joinOf(hatStitches);
  const idOfHat = (hatId: number) => (joinAt !== undefined && hatId > joinAt ? hatId + 1 : hatId);
  const hatIdOf = (id: number) =>
    joinAt === undefined || id <= joinAt ? id : id === joinAt + 1 ? undefined : id - 1;

  const stitches: Stitch[] = [];
  const roundOf: number[] = [];
  const rounds: number[][] = [];
  const slot = (stitch: HatStitch) => slotOf(stitch.colour);

  hatStitches.forEach((hat) => {
    const castOn = hat.fixed || hat.type === "join";
    const id = idOfHat(hat.id);
    if (castOn) {
      // The phantom stitch 0 starts the ring and nothing is worked into it; the first real stitch follows the last once joined.
      const links = hat.id === 0 ? [] : hat.id === 1 && joinAt !== undefined ? [joinAt] : [idOfHat(hat.id - 1)];
      stitches[id] = { id, links, type: "castOn", slot: slot(hat), piece: hatPiece.id };
      if (hat.id !== 0) {
        roundOf[id] = 1;
        (rounds[0] ??= []).push(id);
      }
      if (hat.type === "join") {
        // Joining the round, straight after the last stitch is cast on: a step.
        stitches[id + 1] = { id: id + 1, links: [], type: "join", slot: slot(hat), piece: hatPiece.id };
      }
      return;
    }
    const type = typeOf(hat.type);
    const takes = kinds[type].takes;
    // The hat lists the stitches it works furthest first; here they are in the order they come off the needle.
    const worked = hat.links.slice(0, takes).reverse().map(idOfHat);
    const yarn = hat.links.length > takes ? [idOfHat(hat.links[hat.links.length - 1])] : [];
    stitches[id] = { id, links: [...worked, ...yarn], type, slot: slot(hat), piece: hatPiece.id };
    // One round above the middle stitch it takes, as the hat's chart has always counted them: see the rounds, above.
    const middle = idOfHat(hat.links.slice(0, takes)[Math.floor(takes / 2)]);
    const round = 1 + (roundOf[middle] ?? 1);
    roundOf[id] = round;
    (rounds[round - 1] ??= []).push(id);
  });

  const rows = rounds.filter((round) => round !== undefined);
  const decreases = rows.map((ids) => ids.filter((id) => kinds[stitches[id].type].family === "decrease").length);
  const roundLabels = rows.map((_, at) =>
    at === 0 ? "cast on" : decreases[at] > 0 ? `decrease round, ${decreases[at]} ${decreases[at] === 1 ? "decrease" : "decreases"}` : "",
  );
  const roundPieces = rows.map(() => hatPiece.id);
  const roundKinds = rows.map(() => "round" as const);

  const knitting: HatKnitting = {
    stitches,
    rounds: rows,
    roundLabels,
    roundPieces,
    roundKinds,
    holds: [],
    needleChanges: [],
    checks: {},
    roundHeight: 1,
    knitting: { fromSeam: true, stitches, rounds: rows, roundKinds, roundPieces, roundHeight: 1 },
    hatIdOf,
    idOfHat,
    ...(joinAt === undefined ? {} : { joinId: joinAt + 1 }),
  };
  built.set(hatStitches, knitting);
  return knitting;
};

/** Every stitch of the hat there is to work: the fabric and the join, as many as progress can reach. */
export const lastId = (knitting: Pick<HatKnitting, "stitches">): number => Math.max(knitting.stitches.length - 1, 0);
