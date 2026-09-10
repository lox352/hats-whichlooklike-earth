import { DecreaseMethod, pyramidalBase } from "../types/KnittingMachine";

/**
 * Turns a head measurement and a gauge into a stitch count, and back again.
 *
 * "Stitches per row" is the real input the machine needs, but nobody knows
 * what hat 160 stitches makes. This converts between the two so the number can
 * be chosen from a measurement instead of guessed.
 */

/** Stitches and rows per 10cm, the way gauge is given on a yarn label. */
export interface Gauge {
  stitchesPer10cm: number;
  rowsPer10cm: number;
}

/**
 * A measured gauge in a wool double-knit on the needles this site was built
 * around, rather than a round number. Everything else defaults from it, so the
 * numbers on the design page agree with each other out of the box.
 */
export const defaultGauge: Gauge = {
  stitchesPer10cm: 23,
  rowsPer10cm: 26,
};

/** A typical adult head, in centimetres, measured round the widest part. */
export const defaultHeadCircumference = 56;

/**
 * Height of the straight part of the hat, brim to where the crown starts, in
 * centimetres. A folded-brim beanie is about this before the shaping begins.
 */
export const defaultBodyHeight = 13.5;

/**
 * Hats are knitted smaller than the head so they stay on. 10% is the usual
 * allowance for a ribbed brim in a stretchy wool.
 */
export const negativeEase = 0.9;

export const stitchesPerRowFor = (
  headCircumference: number,
  gauge: Gauge,
  decreaseMethod: DecreaseMethod
): number => {
  const targetCircumference = headCircumference * negativeEase;
  const raw = (targetCircumference / 10) * gauge.stitchesPer10cm;

  // The pyramidal decrease needs a multiple of twice its base; the
  // hemispherical one has no such constraint but an even count still joins
  // more tidily.
  const multiple = decreaseMethod === "Pyramidal" ? pyramidalBase * 2 : 2;
  const rounded = Math.round(raw / multiple) * multiple;
  return Math.max(rounded, multiple);
};

/** The finished circumference a stitch count actually gives, in cm. */
export const circumferenceFor = (
  stitchesPerRow: number,
  gauge: Gauge
): number => (stitchesPerRow / gauge.stitchesPer10cm) * 10;

/** The height of the straight part of the hat, before decreasing, in cm. */
export const bodyHeightFor = (numberOfRows: number, gauge: Gauge): number =>
  (numberOfRows / gauge.rowsPer10cm) * 10;

/**
 * How many rows to knit before decreasing, for a given body height. The crown
 * adds its own height on top, so this is the brim-to-crown straight section.
 */
export const rowsFor = (bodyHeight: number, gauge: Gauge): number =>
  Math.max(Math.round((bodyHeight / 10) * gauge.rowsPer10cm), 1);

export const isValidGauge = (gauge: Gauge): boolean =>
  Number.isFinite(gauge.stitchesPer10cm) &&
  Number.isFinite(gauge.rowsPer10cm) &&
  gauge.stitchesPer10cm > 0 &&
  gauge.rowsPer10cm > 0;

/**
 * The head a given stitch count will actually fit, accounting for the ease.
 * Used to tell the knitter what they have ended up with after rounding.
 */
export const headFittedBy = (
  stitchesPerRow: number,
  gauge: Gauge
): number => circumferenceFor(stitchesPerRow, gauge) / negativeEase;
