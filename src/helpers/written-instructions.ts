import { Stitch } from "../types/Stitch";
import { RGB } from "../types/RGB";
import { indexRows, RowIndex } from "./knitting-progress";

/**
 * The pattern written out in words, row by row.
 *
 * A colourwork chart is normally the better instrument: it shows the shape of
 * the picture, which prose cannot. This exists for the cases a chart does not
 * serve - working from a screen reader, or checking a stitch count without
 * counting squares - so it is offered rather than promoted, and it stays
 * consistent with the chart rather than restating it differently.
 */

export interface InstructionSegment {
  /** Stitch type run, e.g. "k4" or "k3tog". */
  text: string;
  colour: RGB;
  count: number;
}

export interface RowInstruction {
  row: number;
  /** Total stitches worked in this row. */
  stitches: number;
  segments: InstructionSegment[];
}

const sameColour = (a: RGB, b: RGB) =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/**
 * A row becomes runs of "same stitch type, same colour", which is how a
 * knitter reads it: work this many of this, in this yarn.
 */
const segmentsFor = (rowStitches: Stitch[]): InstructionSegment[] => {
  const segments: InstructionSegment[] = [];

  rowStitches.forEach((stitch) => {
    const last = segments[segments.length - 1];
    const plainKnit = stitch.type === "k1" || stitch.type === "join";

    if (
      last &&
      plainKnit &&
      last.text.startsWith("k") &&
      !last.text.includes("tog") &&
      sameColour(last.colour, stitch.colour)
    ) {
      last.count += 1;
      last.text = `k${last.count}`;
      return;
    }

    if (plainKnit) {
      segments.push({ text: "k1", colour: stitch.colour, count: 1 });
      return;
    }

    // Decreases are never merged: each one is a distinct instruction.
    segments.push({ text: stitch.type, colour: stitch.colour, count: 1 });
  });

  return segments;
};

export const writtenInstructions = (
  stitches: Stitch[],
  index: RowIndex = indexRows(stitches)
): RowInstruction[] => {
  const byId = new Map(stitches.map((stitch) => [stitch.id, stitch]));

  return index.rows.map((ids, position) => {
    const rowStitches = ids
      .map((id) => byId.get(id))
      .filter((stitch): stitch is Stitch => stitch !== undefined);

    return {
      row: position + 1,
      stitches: rowStitches.length,
      segments: segmentsFor(rowStitches),
    };
  });
};

/** One row as a single line, given a way to name each yarn. */
export const rowToText = (
  row: RowInstruction,
  nameOf: (colour: RGB) => string
): string => {
  const parts = row.segments.map(
    (segment) => `${segment.text} ${nameOf(segment.colour)}`
  );
  return `Row ${row.row} (${row.stitches} sts): ${parts.join(", ")}`;
};

/** The whole pattern as plain text, for copying or a screen reader. */
export const instructionsToText = (
  stitches: Stitch[],
  nameOf: (colour: RGB) => string
): string =>
  writtenInstructions(stitches)
    .map((row) => rowToText(row, nameOf))
    .join("\n");
