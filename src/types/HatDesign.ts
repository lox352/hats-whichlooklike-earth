import { DecreaseMethod } from "./KnittingMachine";
import { OrientationParameters } from "./OrientationParameters";
import {
  defaultBrimRounds,
  defaultDecreaseMethod,
  defaultNumberOfRows,
  defaultStitchesPerRow,
} from "../helpers/sizing";
import {
  Brim,
  brimNeedlesFor,
  defaultNeedles,
  defaultTrim,
} from "../helpers/brim";
import { defaultOrientationParameters } from "./OrientationParameters";

/**
 * Everything needed to reproduce a hat.
 *
 * The stitches themselves are a pure function of this (KnittingMachine is
 * seeded from the stitch count), so this is the only thing that has to travel
 * in a URL or be remembered across a refresh.
 */
export interface HatDesign {
  stitchesPerRow: number;
  numberOfRows: number;
  decreaseMethod: DecreaseMethod;
  orientation: OrientationParameters;
  /** The hat's needles, in millimetres. */
  needles: number;
  /** Its brim: as many rounds as it has, 0 for none, and its needles and colour. See helpers/brim. */
  brim: Brim;
}

export const defaultHatDesign: HatDesign = {
  stitchesPerRow: defaultStitchesPerRow,
  numberOfRows: defaultNumberOfRows,
  decreaseMethod: defaultDecreaseMethod,
  orientation: defaultOrientationParameters,
  needles: defaultNeedles,
  brim: {
    rounds: defaultBrimRounds,
    needles: brimNeedlesFor(defaultNeedles),
    colour: defaultTrim,
  },
};

/** The brim to knit a design with, or none. */
export const brimOf = (design: HatDesign): Brim | undefined =>
  design.brim.rounds > 0 ? design.brim : undefined;
