import { DecreaseMethod } from "./KnittingMachine";
import { OrientationParameters } from "./OrientationParameters";
import {
  defaultDecreaseMethod,
  defaultNumberOfRows,
  defaultStitchesPerRow,
} from "../helpers/sizing";
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
}

export const defaultHatDesign: HatDesign = {
  stitchesPerRow: defaultStitchesPerRow,
  numberOfRows: defaultNumberOfRows,
  decreaseMethod: defaultDecreaseMethod,
  orientation: defaultOrientationParameters,
};
