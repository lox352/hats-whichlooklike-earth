import KnittingMachine, {
  DecreaseMethod,
  pyramidalBase,
} from "../types/KnittingMachine";
import { Point } from "../types/Point";
import { adjacentStitchDistance } from "../constants";
import { Stitch } from "../types/Stitch";

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

const getStitches = (
  stitchesPerRow: number,
  numberOfRows: number,
  decreaseType: DecreaseMethod
): Stitch[] => {
  const knittingMachine = new KnittingMachine(stitchesPerRow);
  knittingMachine.castOnRow(generateCircle(stitchesPerRow)).join();
  for (let i = 1; i < numberOfRows - 1; i++) {
    knittingMachine.knitRow(["k1"]);
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
