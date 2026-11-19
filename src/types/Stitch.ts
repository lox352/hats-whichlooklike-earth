import { RGB } from "./RGB";
import { Point } from "./Point";
import { StitchType } from "./StitchType";

export interface Stitch {
  id: number;
  position: Point;
  links: number[];
  fixed: boolean;
  type: StitchType;
  colour: RGB;
  /**
   * The country or ocean the centre of this stitch landed on, by the key its
   * description is filed under in data/region-names.ts.
   *
   * Absent on hats charted before this was recorded. Nothing else a saved
   * pattern keeps can say which way the globe was turned to make it, so there
   * is no working it out afterwards: those hats simply go unlabelled.
   */
  region?: string;
  /**
   * Part of the brim: knitted in the trim and on the smaller needles, and no
   * part of the picture, which is projected onto the rest of the hat.
   */
  brim?: true;
  /**
   * The needles it is knitted on, in millimetres, where they change: on the
   * first stitch cast on, and on the first stitch after the brim. Absent on
   * hats knitted before there was a brim.
   */
  needles?: number;
}
