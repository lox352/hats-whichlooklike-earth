import { Stitch } from "../types/Stitch";
import { hatKnitting, hatPiece } from "../knitting/hat-knitting";
import { indexRounds, roundParts, runInstruction } from "../reading/progress";

/**
 * The pattern written out in words, round by round.
 *
 * A colourwork chart is normally the better instrument: it shows the shape of
 * the picture, which prose cannot. This exists for the cases a chart does not
 * serve - working from a screen reader, or checking a stitch count without
 * counting squares - so it is offered rather than promoted. It reads the
 * knitting the chart and the knitting panel read (see knitting/hat-knitting),
 * so its rounds are theirs, and so are its words for a stitch: the knitting
 * panel's "Knit 16", "K2tog", "S2kp x 3".
 */

export interface InstructionSegment {
  /** As the knitting panel says it: "Knit 16", "Cast on 12", "K2tog". */
  text: string;
  /** The yarn, as a slot: see knitting/yarns. */
  slot: string;
  /** Stitches worked. */
  count: number;
}

export interface RoundInstruction {
  round: number;
  /** Stitches worked in this round. */
  stitches: number;
  segments: InstructionSegment[];
  /** Whether the round is joined into a ring after it: the cast-on. */
  joinAfter: boolean;
  /** The needles changed to after it, in millimetres: after a brim. */
  needlesAfter?: number;
}

/** A round's segments, those in one yarn after another together, so the yarn is said once: "knit 5, m1, knit 8 in Brim". */
export const bySlot = (segments: InstructionSegment[]): { slot: string; texts: string[] }[] =>
  segments.reduce<{ slot: string; texts: string[] }[]>((groups, segment) => {
    const last = groups[groups.length - 1];
    if (last && last.slot === segment.slot) last.texts.push(segment.text);
    else groups.push({ slot: segment.slot, texts: [segment.text] });
    return groups;
  }, []);

export const writtenInstructions = (hat: Stitch[]): RoundInstruction[] => {
  const knitting = hatKnitting(hat);
  const index = indexRounds(knitting.rounds, knitting.roundLabels, knitting.roundPieces, [hatPiece], knitting.roundKinds);
  return knitting.rounds.map((ids, at) => {
    const segments = roundParts(knitting.stitches, ids, index).flatMap((part) =>
      "run" in part ? [{ text: runInstruction(part.run), slot: part.run.slot, count: part.run.length }] : [],
    );
    const last = ids[ids.length - 1] ?? 0;
    const change = knitting.needleChanges.includes(at + 1)
      ? knitting.stitches.find((stitch) => stitch.type === "needles" && stitch.id > last)?.needles
      : undefined;
    return {
      round: at + 1,
      stitches: ids.length,
      segments,
      joinAfter: knitting.stitches[last + 1]?.type === "join",
      ...(change === undefined ? {} : { needlesAfter: change }),
    };
  });
};

/** One round as a single line, given a way to name each yarn. */
export const roundToText = (round: RoundInstruction, nameOf: (slot: string) => string): string => {
  const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
  const parts = bySlot(round.segments).map(
    ({ slot, texts }, at) => `${texts.map((text, one) => (at === 0 && one === 0 ? text : lower(text))).join(", ")} in ${nameOf(slot)}`,
  );
  const after = `${round.joinAfter ? " Join in the round." : ""}${
    round.needlesAfter === undefined ? "" : ` Change to ${round.needlesAfter}mm needles.`
  }`;
  return `Round ${round.round} (${round.stitches} sts): ${parts.join(", ")}.${after}`;
};

/** The whole pattern as plain text, for copying or a screen reader. */
export const instructionsToText = (hat: Stitch[], nameOf: (slot: string) => string): string =>
  writtenInstructions(hat)
    .map((round) => roundToText(round, nameOf))
    .join("\n");
