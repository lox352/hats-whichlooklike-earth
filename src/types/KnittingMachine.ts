import { Point } from "./Point";
import { Stitch } from "./Stitch";
import { StitchType } from "./StitchType";
import { RGB } from "../types/RGB";
import { adjacentStitchDistance, verticalStitchDistance } from "../constants";
import seedrandom from "seedrandom";
import { minimumBrimRounds } from "../helpers/brim";

const defaultColour: RGB = [255, 255, 255];

export type DecreaseMethod = "Hemispherical" | "Pyramidal";

/** The polygonal base used by the pyramidal decrease. */
export const pyramidalBase = 5;

/** A hat needs a cast-on row, some body, and room to decrease. */
export const minimumStitchesPerRow = 20;
export const minimumNumberOfRows = 3;

export interface DesignProblem {
  field: "stitchesPerRow" | "numberOfRows" | "brimRounds";
  message: string;
}

/**
 * Checks a design against the invariants the machine relies on, so the UI can
 * report them inline instead of duplicating the rules.
 */
export const validateDesign = (
  stitchesPerRow: number,
  numberOfRows: number,
  decreaseMethod: DecreaseMethod,
  /** Rounds of brim, 0 for none: see helpers/brim. */
  brimRounds = 0
): DesignProblem[] => {
  const problems: DesignProblem[] = [];

  if (!Number.isInteger(stitchesPerRow) || stitchesPerRow < minimumStitchesPerRow) {
    problems.push({
      field: "stitchesPerRow",
      message: `Use at least ${minimumStitchesPerRow} stitches per row.`,
    });
  } else if (
    decreaseMethod === "Pyramidal" &&
    stitchesPerRow % (pyramidalBase * 2) !== 0
  ) {
    problems.push({
      field: "stitchesPerRow",
      message:
        `The pyramidal decrease needs a stitch count divisible by ${pyramidalBase * 2}. ` +
        `Try ${Math.round(stitchesPerRow / (pyramidalBase * 2)) * (pyramidalBase * 2)}, ` +
        "or switch to the hemispherical decrease.",
    });
  }

  if (!Number.isInteger(numberOfRows) || numberOfRows < minimumNumberOfRows) {
    problems.push({
      field: "numberOfRows",
      message: `Use at least ${minimumNumberOfRows} rows before decreasing.`,
    });
  }

  if (
    !Number.isInteger(brimRounds) ||
    (brimRounds !== 0 && brimRounds < minimumBrimRounds)
  ) {
    problems.push({
      field: "brimRounds",
      message: `A brim needs at least ${minimumBrimRounds} rounds: casting on, a round of rib and the round that increases. Or 0 for none.`,
    });
  }

  return problems;
};

class KnittingMachine {
  private stitchesPerRow: number;
  private rng: () => number;
  /**
   * The last stitch of the round below taken onto the needle and worked: the
   * next stitch knitted works into the one after it. Kept rather than read
   * off the last stitch's links, because a make-one takes nothing from below.
   */
  private consumed = 0;
  stitches: Stitch[];

  constructor(stitchesPerRow: number) {
    this.rng = seedrandom(stitchesPerRow.toString());
    this.stitches = [];
    this.stitchesPerRow = stitchesPerRow;
  }

  castOnRow(
    getStitchPosition: (stitchNumber: number) => Point,
    /** How many to cast on: the hat's own count, or a brim's fewer. */
    count = this.stitchesPerRow
  ): KnittingMachine {
    for (let i = 0; i < count; i++) {
      const links = i == 0 ? [] : [i - 1];
      const newStitch: Stitch = {
        id: i,
        position: getStitchPosition(i),
        links,
        fixed: true,
        colour: defaultColour,
        type: "k1",
      };
      this.stitches.push(newStitch);
    }

    return this;
  }

  knitRow(pattern: StitchType[]): KnittingMachine {
    const numberOfStitchesInRow = this.numberOfStitchesInRow();
    const patternLength = pattern
      .map((stitchType) => {
        switch (stitchType) {
          case "k1":
          case "p1":
            return 1 as number;
          case "k2tog":
            return 2 as number;
          case "k3tog":
            return 3 as number;
          default:
            return 0 as number;
        }
      })
      .reduce((a, b) => a + b, 0);
    const numberOfTimesToKnitPattern = Math.floor(
      numberOfStitchesInRow / patternLength
    );

    for (let i = 0; i < numberOfTimesToKnitPattern; i++) {
      this.knitPattern(pattern);
    }

    return this;
  }

  knit(stitchType: StitchType): KnittingMachine {
    switch (stitchType) {
      case "k1":
        this.knit1();
        break;
      case "p1":
        this.knit1("p1");
        break;
      case "m1":
        this.makeOne();
        break;
      case "k2tog":
        this.knit2Tog();
        break;
      case "k3tog":
        this.knit3Tog();
        break;
      case "join":
        this.join();
        break;
    }

    return this;
  }

  knit1(type: "k1" | "p1" = "k1"): KnittingMachine {
    const stitchesInCurrentRow = this.numberOfStitchesInRow();
    const lastStitch = this.stitches[this.stitches.length - 1];

    const stitchFromLastRow = this.stitches[this.consumed];
    const links = [stitchFromLastRow.id + 1, lastStitch.id];

    const linkedStitch = this.stitches[links[0]];
    const radiusScaleFactor =
      (adjacentStitchDistance * stitchesInCurrentRow) /
      (2 * Math.PI) /
      (linkedStitch.position.x ** 2 + linkedStitch.position.z ** 2) ** 0.5;
    const newPosition = {
      y: linkedStitch.position.y + verticalStitchDistance,
      x: linkedStitch.position.x * radiusScaleFactor,
      z: linkedStitch.position.z * radiusScaleFactor,
    };

    const newStitch: Stitch = {
      id: lastStitch.id + 1,
      position: newPosition,
      links: links,
      type,
      fixed: false,
      colour: defaultColour,
    };

    this.stitches.push(newStitch);
    this.consumed = links[0];

    return this;
  }

  /**
   * Make a stitch between two, out of nothing below: the strand between the
   * stitch just worked and the next. It takes nothing from the round below,
   * so the round grows by one; its first link is to the stitch below the bar
   * it hangs from, which takes nothing off the needle but holds it up.
   */
  makeOne(): KnittingMachine {
    const stitchesInCurrentRow = this.numberOfStitchesInRow() + 1;
    const lastStitch = this.stitches[this.stitches.length - 1];
    // Where the next stitch will be worked: the new one sits over the gap before it.
    const below = this.stitches[this.consumed + 1] ?? this.stitches[this.consumed];
    const radiusScaleFactor =
      (adjacentStitchDistance * stitchesInCurrentRow) /
      (2 * Math.PI) /
      (below.position.x ** 2 + below.position.z ** 2) ** 0.5;
    this.stitches.push({
      id: lastStitch.id + 1,
      position: {
        y: below.position.y + verticalStitchDistance,
        x: below.position.x * radiusScaleFactor,
        z: below.position.z * radiusScaleFactor,
      },
      // Drawn up from the bar after the stitch below just worked, which holds it up; then the yarn from the last.
      links: [this.consumed, lastStitch.id],
      type: "m1",
      fixed: false,
      colour: defaultColour,
    });
    return this;
  }

  /** Rounds of knit two, purl two: a brim's rib. */
  rib(rounds: number): KnittingMachine {
    for (let i = 0; i < rounds; i++) this.knitRow(["k1", "k1", "p1", "p1"]);
    return this;
  }

  /**
   * One round knitted, making as many stitches between as it takes to reach
   * `target`, spread as evenly round it as they go: the round at the top of a
   * brim that takes its stitches up to the hat's.
   */
  increaseTo(target: number): KnittingMachine {
    const from = this.numberOfStitchesInRow();
    const more = Math.max(target - from, 0);
    // Half a repeat in, so the round reads "k4, m1, (k9, m1) to the last 5, k5" and no make-one sits at the marker.
    const at = (i: number) => Math.floor((i * more + Math.floor(from / 2)) / from);
    for (let i = 0; i < from; i++) {
      this.knit1();
      if (at(i + 1) > at(i)) this.makeOne();
    }
    return this;
  }

  knit2Tog(): KnittingMachine {
    const stitchesInCurrentRow = this.numberOfStitchesInRow() - 1;
    const lastStitch = this.stitches[this.stitches.length - 1];

    const stitchFromLastRow = this.stitches[this.consumed];
    const links = [
      stitchFromLastRow.id + 2,
      stitchFromLastRow.id + 1,
      lastStitch.id,
    ];

    const linkedStitch = this.stitches[links[1]];
    const radiusScaleFactor =
      (adjacentStitchDistance * stitchesInCurrentRow) /
      (2 * Math.PI) /
      (linkedStitch.position.x ** 2 + linkedStitch.position.z ** 2) ** 0.5;
    const newPosition = {
      y: linkedStitch.position.y + verticalStitchDistance,
      x: linkedStitch.position.x * radiusScaleFactor,
      z: linkedStitch.position.z * radiusScaleFactor,
    };

    const newStitch: Stitch = {
      id: lastStitch.id + 1,
      position: newPosition,
      links: links,
      type: "k2tog",
      fixed: false,
      colour: defaultColour,
    };

    this.stitches.push(newStitch);
    this.consumed = links[0];

    return this;
  }

  knit3Tog(): KnittingMachine {
    const stitchesInCurrentRow = this.numberOfStitchesInRow() - 2;
    const lastStitch = this.stitches[this.stitches.length - 1];

    const stitchFromLastRow = this.stitches[this.consumed];
    const links = [
      stitchFromLastRow.id + 3,
      stitchFromLastRow.id + 2,
      stitchFromLastRow.id + 1,
      lastStitch.id,
    ];

    const linkedStitch = this.stitches[links[1]];
    const radiusScaleFactor =
      (adjacentStitchDistance * stitchesInCurrentRow) /
      (2 * Math.PI) /
      (linkedStitch.position.x ** 2 + linkedStitch.position.z ** 2) ** 0.5;
    const newPosition = {
      y: linkedStitch.position.y + verticalStitchDistance,
      x: linkedStitch.position.x * radiusScaleFactor,
      z: linkedStitch.position.z * radiusScaleFactor,
    };

    const newStitch: Stitch = {
      id: lastStitch.id + 1,
      position: newPosition,
      links: links,
      type: "k3tog",
      fixed: false,
      colour: defaultColour,
    };

    this.stitches.push(newStitch);
    this.consumed = links[0];

    return this;
  }

  join(): KnittingMachine {
    const lastStitch = this.stitches[this.stitches.length - 1];
    const newStitch: Stitch = {
      id: lastStitch.id + 1,
      position: lastStitch.position,
      links: [0, lastStitch.id],
      type: "join",
      fixed: true,
      colour: defaultColour,
    };
    this.stitches.push(newStitch);
    this.consumed = 0;

    return this;
  }

  public decreaseHemispherically(decreaseDistance: number): KnittingMachine {
    for (let i = 0; i < decreaseDistance; i++) {
      this.decreaseOneRowHemispherically(i, decreaseDistance);
    }
    for (let i = 0; i <= this.numberOfStitchesInRow(); i = i + 2) {
      this.knit2Tog();
    }

    return this;
  }

  public decreasePyramidically(polygonalBase: number): KnittingMachine {
    if (this.stitchesPerRow % (polygonalBase * 2) !== 0) {
      throw new Error(
        `A pyramidal decrease with base ${polygonalBase} needs a stitch count ` +
          `divisible by ${polygonalBase * 2}, but got ${this.stitchesPerRow}`
      );
    }
    const numberOfDecreases = this.stitchesPerRow / (polygonalBase * 2);
    for (let i = 0; i < numberOfDecreases - 1; i++) {
      this.knit1();
      this.decreaseOneRowPyramidically(polygonalBase);
      if (i <= numberOfDecreases / 2) {
        this.knitRow(["k1"]);
      }
    }

    for (let i = 0; i < polygonalBase; i++) {
      this.knit2Tog();
    }

    return this;
  }

  private knitPattern(pattern: StitchType[]): void {
    pattern.forEach((stitchType) => {
      this.knit(stitchType);
    });
  }

  private decreaseOneRowHemispherically(
    rowIndex: number,
    decreaseDistance: number
  ): void {
    const targetRowCount = Math.ceil(
      this.stitchesPerRow *
        Math.cos((rowIndex + 0.5) * (Math.PI / 2 / decreaseDistance))
    );

    const currentRowCount = this.numberOfStitchesInRow();
    if (currentRowCount <= 12) {
      return;
    }

    const stitchesToRemove = currentRowCount - targetRowCount;

    if (stitchesToRemove < 2) {
      this.knitRow(["k1"]);
      return;
    }

    const segmentLength = Math.floor(currentRowCount / (stitchesToRemove / 2));
    const randomIndex = Math.floor(this.rng() * (segmentLength - 2));
    const segment: StitchType[] = Array.from(
      { length: randomIndex },
      () => "k1"
    );
    segment.push("k3tog");
    for (let i = 0; i < segmentLength - randomIndex - 2; i++) {
      segment.push("k1");
    }

    this.knitRow(segment);
  }

  private decreaseOneRowPyramidically(polygonalBase: number): void {
    const currentRowCount = this.numberOfStitchesInRow();
    const segmentLength = currentRowCount / polygonalBase;
    const segment: StitchType[] = Array.from(
      { length: segmentLength - 3 },
      () => "k1"
    );
    segment.push("k3tog");
    this.knitRow(segment);
  }

  /** The stitches on the needle: everything made since the last stitch taken from below. */
  private numberOfStitchesInRow(): number {
    const finalStitch = this.stitches[this.stitches.length - 1];
    return finalStitch.id - this.consumed;
  }
}

export default KnittingMachine;
