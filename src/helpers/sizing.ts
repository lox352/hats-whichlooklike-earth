import {
  DecreaseMethod,
  minimumNumberOfRows,
  pyramidalBase,
} from "../types/KnittingMachine";
import { getStitches } from "./stitches";
import { indexRows } from "./knitting-progress";

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
 * Ear to ear over the crown, in centimetres: the tape run from where the hat's
 * edge should sit by one ear, up over the top of the head, and down to the same
 * point on the other side.
 *
 * Half of it is the finished height of the hat, brim edge to crown, which is
 * how a beanie is normally specified. This is the measurement to ask for
 * because you can take it on a head; "how tall should the straight part be
 * before the crown starts" is a property of the pattern, not of anyone's head,
 * and was what this used to ask.
 *
 * 34cm suits a typical adult: a 56cm head is about 28cm over the top between
 * the ears, plus about 3cm each side to cover them. That gives a 17cm hat,
 * which is a beanie that sits on the ears rather than a slouchy one.
 */
export const defaultOverTheTop = 34;

/** Finished height of the hat, brim edge to crown, from the arc over the head. */
export const hatHeightFromArc = (overTheTop: number): number =>
  Math.max(overTheTop, 0) / 2;


/*
 * The hat is knitted the size of the head, with no allowance taken off.
 *
 * There was a 10% negative ease here, the usual textbook allowance. It does
 * not belong: the measurement asked for is a tape run round the head, which
 * is already tight to the skull, so taking another tenth off it makes a hat a
 * size too small. Anything the fabric needs to grip, it gets from being
 * knitted to that measurement rather than from being knitted under it.
 */
export const stitchesPerRowFor = (
  headCircumference: number,
  gauge: Gauge,
  decreaseMethod: DecreaseMethod
): number => {
  const raw = (headCircumference / 10) * gauge.stitchesPer10cm;

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
 * How many rows the crown takes, for a given stitch count and shaping.
 *
 * Measured from the knitting machine rather than derived. The pyramidal crown
 * happens to be linear in the stitch count, but the hemispherical one depends
 * on a seeded random distribution of decreases and has no tidy closed form, and
 * a formula for either would silently drift if the shaping ever changed.
 *
 * The crown does not depend on how long the body is - verified in the tests -
 * so it can be measured on a hat knitted with the shortest legal body and then
 * reused. Memoised, because the answer only changes when the stitch count or
 * the shaping does.
 */
const crownRowCache = new Map<string, number>();

export const crownRowsFor = (
  stitchesPerRow: number,
  decreaseMethod: DecreaseMethod
): number => {
  const key = `${stitchesPerRow}:${decreaseMethod}`;
  const cached = crownRowCache.get(key);
  if (cached !== undefined) return cached;

  let rows = 0;
  try {
    const body = minimumNumberOfRows;
    rows = Math.max(
      indexRows(getStitches(stitchesPerRow, body, decreaseMethod)).totalRows -
        body,
      0
    );
  } catch {
    // An invalid stitch count for this shaping; the design validator reports
    // that separately, so just claim no crown rather than throwing from here.
    rows = 0;
  }

  crownRowCache.set(key, rows);
  return rows;
};

/** Total rows in the finished hat: the body plus the crown. */
export const totalRowsFor = (
  stitchesPerRow: number,
  numberOfRows: number,
  decreaseMethod: DecreaseMethod
): number => numberOfRows + crownRowsFor(stitchesPerRow, decreaseMethod);

/** Finished height of the hat, brim edge to crown, in cm. */
export const totalHeightFor = (
  stitchesPerRow: number,
  numberOfRows: number,
  gauge: Gauge,
  decreaseMethod: DecreaseMethod
): number =>
  (totalRowsFor(stitchesPerRow, numberOfRows, decreaseMethod) /
    gauge.rowsPer10cm) *
  10;

/**
 * Rows of body needed for a finished hat of this height, once the crown has
 * taken its share. Never returns fewer than the machine will accept, so a hat
 * asked to be shorter than its own crown still knits.
 */
export const bodyRowsForHeight = (
  hatHeight: number,
  stitchesPerRow: number,
  gauge: Gauge,
  decreaseMethod: DecreaseMethod
): number => {
  const totalRows = Math.round((hatHeight / 10) * gauge.rowsPer10cm);
  const crown = crownRowsFor(stitchesPerRow, decreaseMethod);
  return Math.max(totalRows - crown, minimumNumberOfRows);
};

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

/*
 * There is no `headFittedBy` any more. With no ease, the head a count fits is
 * the hat's own circumference, so `circumferenceFor` answers both questions
 * and there is only one number for the design page to report.
 */

/** What a design starts as, before anyone has chosen otherwise. */
export const defaultDecreaseMethod: DecreaseMethod = "Pyramidal";

/*
 * The numbers a fresh design page opens with.
 *
 * Worked out here, from the default head and gauge above, by the same
 * functions the "work out my stitches" button calls. They used to be literals
 * kept honest by a test, which meant a change to any default measurement left
 * the stitch count describing a head nobody had asked for until someone
 * noticed the test.
 */
export const defaultStitchesPerRow = stitchesPerRowFor(
  defaultHeadCircumference,
  defaultGauge,
  defaultDecreaseMethod
);

export const defaultNumberOfRows = bodyRowsForHeight(
  hatHeightFromArc(defaultOverTheTop),
  defaultStitchesPerRow,
  defaultGauge,
  defaultDecreaseMethod
);
