import { Stitch } from "./Stitch";

/**
 * Version of the persisted pattern shape. Bump this whenever the stored fields
 * change, and add a migration step in helpers/pattern-storage.ts so patterns
 * saved by older builds keep working.
 *
 * 1 - original shape. `savedAt` was written by JSON.stringify(new Date()), so it
 *     was always a string on the way back out despite being typed as a Date.
 * 2 - `savedAt` typed honestly as an ISO string; `version` recorded explicitly.
 * 3 - every stitch carries the country or ocean it landed on, in `region`.
 *     There is no migration step, and deliberately so: a pattern saved before
 *     this records no orientation, so there is no way to work out afterwards
 *     where it was pointed. Older entries are read as they are and stay
 *     unlabelled, which every reader of `region` is written to expect.
 * 4 - `progress` counts the knitting as the chart and the knitting panel read
 *     it (see knitting/hat-knitting), where joining the round is a step of
 *     its own after the cast-on, and so every stitch after it is one further
 *     on than the hat's own id. Older entries are moved on as they are read:
 *     a hat knitted as far as its join has joined the round.
 */
export const currentPatternVersion = 4;

export interface SavedPattern {
  version: number;
  /** Full localStorage key, e.g. "pattern-1736300000000". */
  id: string;
  name?: string;
  /** ISO 8601. JSON has no Date type, so this is deliberately not a Date. */
  savedAt: string;
  stitches: Stitch[];
  /**
   * Id of the last stitch or step worked, in the knitting as it is read (see
   * knitting/hat-knitting), not the hat's own ids. 0 means nothing knitted yet.
   */
  progress: number;
}
