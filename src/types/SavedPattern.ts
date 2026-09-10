import { Stitch } from "./Stitch";

/**
 * Version of the persisted pattern shape. Bump this whenever the stored fields
 * change, and add a migration step in helpers/pattern-storage.ts so patterns
 * saved by older builds keep working.
 *
 * 1 - original shape. `savedAt` was written by JSON.stringify(new Date()), so it
 *     was always a string on the way back out despite being typed as a Date.
 * 2 - `savedAt` typed honestly as an ISO string; `version` recorded explicitly.
 */
export const currentPatternVersion = 2;

export interface SavedPattern {
  version: number;
  /** Full localStorage key, e.g. "pattern-1736300000000". */
  id: string;
  name?: string;
  /** ISO 8601. JSON has no Date type, so this is deliberately not a Date. */
  savedAt: string;
  stitches: Stitch[];
  /** Id of the last stitch knitted. 0 means nothing knitted yet. */
  progress: number;
}
