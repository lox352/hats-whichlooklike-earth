import { useMemo } from "react";
import type { Stitch as HatStitch } from "../types/Stitch";
import { hatKnitting, hatPiece } from "./hat-knitting";
import { paletteFrom } from "./yarns";
import { indexRounds, roundNames, roundWhats } from "../reading/progress";
import { layOutSweater } from "../reading/layout";
import { useYarns } from "../useYarns";

/**
 * Everything the chart, the knitting panel and the key read off a hat, worked
 * out once a hat: its knitting, its rounds as a knitter counts them, its chart
 * laid out, what each round is called, and what each yarn looks like.
 *
 * Only the palette follows the knitter's yarns; the rest follows the stitches,
 * which never change once a hat is saved.
 */
export const useHatKnitting = (hatStitches: HatStitch[]) => {
  const { yarns } = useYarns();
  const knitting = useMemo(() => hatKnitting(hatStitches), [hatStitches]);
  const index = useMemo(
    () => indexRounds(knitting.rounds, knitting.roundLabels, knitting.roundPieces, [hatPiece], knitting.roundKinds),
    [knitting],
  );
  const layout = useMemo(
    () => layOutSweater(knitting.stitches, knitting.rounds, knitting.roundKinds, knitting.roundPieces),
    [knitting],
  );
  const slots = useMemo(() => new Set(knitting.stitches.map((stitch) => stitch.slot)), [knitting]);
  const palette = useMemo(() => paletteFrom(yarns, slots), [yarns, slots]);
  const names = useMemo(() => roundNames(index), [index]);
  const whats = useMemo(() => roundWhats(index), [index]);
  return { knitting, stitches: knitting.stitches, rounds: knitting.rounds, index, layout, palette, names, whats };
};

export type HatReading = ReturnType<typeof useHatKnitting>;
