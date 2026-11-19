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
}

export const writtenInstructions = (hat: Stitch[]): RoundInstruction[] => {
  const knitting = hatKnitting(hat);
  const index = indexRounds(knitting.rounds, knitting.roundLabels, knitting.roundPieces, [hatPiece], knitting.roundKinds);
  return knitting.rounds.map((ids, at) => {
    const segments = roundParts(knitting.stitches, ids, index).flatMap((part) =>
      "run" in part ? [{ text: runInstruction(part.run), slot: part.run.slot, count: part.run.length }] : [],
    );
    const last = ids[ids.length - 1] ?? 0;
    return {
      round: at + 1,
      stitches: ids.length,
      segments,
      joinAfter: knitting.stitches[last + 1]?.type === "join",
    };
  });
};

/** One round as a single line, given a way to name each yarn. */
export const roundToText = (round: RoundInstruction, nameOf: (slot: string) => string): string => {
  const parts = round.segments.map(
    (segment, at) => `${at === 0 ? segment.text : segment.text.charAt(0).toLowerCase() + segment.text.slice(1)} in ${nameOf(segment.slot)}`,
  );
  return `Round ${round.round} (${round.stitches} sts): ${parts.join(", ")}.${round.joinAfter ? " Join in the round." : ""}`;
};

/** The whole pattern as plain text, for copying or a screen reader. */
export const instructionsToText = (hat: Stitch[], nameOf: (slot: string) => string): string =>
  writtenInstructions(hat)
    .map((round) => roundToText(round, nameOf))
    .join("\n");
