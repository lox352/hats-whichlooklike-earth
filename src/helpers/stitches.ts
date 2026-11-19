import KnittingMachine, {
  DecreaseMethod,
  pyramidalBase,
} from "../types/KnittingMachine";
import { Point } from "../types/Point";
import { adjacentStitchDistance } from "../constants";
import { Stitch } from "../types/Stitch";
import { Brim, brimStitchesFor, minimumBrimRounds } from "./brim";

const generateCircle =
  (numPoints: number) =>
  (point: number): Point => {
    return {
      x:
        (adjacentStitchDistance *
          numPoints *
          Math.cos((point / numPoints) * Math.PI * 2)) /
        (2 * Math.PI),
      y: (point * adjacentStitchDistance) / numPoints,
      z:
        (adjacentStitchDistance *
          numPoints *
          Math.sin((point / numPoints) * Math.PI * 2)) /
        (2 * Math.PI),
    };
  };

/**
 * A hat's stitches: cast on, joined, knitted straight, and decreased to the
 * crown. With a brim, it is cast on with the brim's fewer stitches and
 * ribbed, increased to the hat's count, and then knitted on as before, so
 * the hat above it is stitch for stitch the hat that has no brim; see
 * helpers/brim.
 */
const getStitches = (
  stitchesPerRow: number,
  numberOfRows: number,
  decreaseType: DecreaseMethod,
  options: {
    brim?: Brim;
    /** The hat's needles, in millimetres, recorded where it begins. */
    needles?: number;
  } = {}
): Stitch[] => {
  const { brim, needles } = options;
  const knittingMachine = new KnittingMachine(stitchesPerRow);
  const ribbed = brim !== undefined && brim.rounds >= minimumBrimRounds;
  if (ribbed) {
    const cast = brimStitchesFor(stitchesPerRow);
    knittingMachine.castOnRow(generateCircle(cast), cast).join();
    knittingMachine.rib(brim.rounds - 2);
    knittingMachine.increaseTo(stitchesPerRow);
    const top = knittingMachine.stitches.length;
    knittingMachine.stitches.forEach((stitch) => {
      stitch.brim = true;
      stitch.colour = [...brim.colour];
    });
    knittingMachine.stitches[0].needles = brim.needles;
    // Then on the hat's own: a hat with no brim has knitted its cast-on as its first round, and this one knits that round too.
    for (let i = 0; i < numberOfRows - 1; i++) {
      knittingMachine.knitRow(["k1"]);
    }
    if (needles !== undefined && knittingMachine.stitches[top]) knittingMachine.stitches[top].needles = needles;
  } else {
    knittingMachine.castOnRow(generateCircle(stitchesPerRow)).join();
    for (let i = 1; i < numberOfRows - 1; i++) {
      knittingMachine.knitRow(["k1"]);
    }
    if (needles !== undefined) knittingMachine.stitches[0].needles = needles;
  }
  if (decreaseType === "Hemispherical") {
    knittingMachine.decreaseHemispherically(Math.floor(stitchesPerRow / 4));
  } else {
    knittingMachine.decreasePyramidically(pyramidalBase);
  }

  return knittingMachine.stitches;
};

/**
 * The cast-on row is the run of fixed stitches at the start of the hat. The
 * `join` stitch that closes the round into a tube is also fixed and sits
 * directly after it, so it has to be excluded by type: counting every fixed
 * stitch gives one too many, and so does stopping at the first dynamic stitch.
 */
const countCastOnStitches = (stitches: Stitch[]): number =>
  stitches.filter((stitch) => stitch.fixed && stitch.type !== "join").length;

export { getStitches, generateCircle, countCastOnStitches };
