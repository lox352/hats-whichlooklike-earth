import {
  currentPatternVersion,
  SavedPattern,
} from "../types/SavedPattern";
import { Stitch } from "../types/Stitch";
import { joinOf, progressFromHat } from "../knitting/hat-knitting";
import { deleteLog } from "../projects/timing/log";

/**
 * Every read and write of a saved pattern goes through this module.
 *
 * Two rules it exists to enforce:
 *  - a single unreadable entry must never take down the page that lists them, and
 *  - patterns written by an older build must keep opening, so reads migrate
 *    forward rather than rejecting anything unfamiliar.
 */

const keyPrefix = "pattern-";

/** Fired after any write, so open views can re-read. */
/*
 * Marks a pattern link as "open this straight into knitting mode".
 *
 * In the URL rather than in router state so that it survives a refresh: put
 * the phone down mid-row, come back to it, and you are still knitting.
 */
export const knittingParam = "knitting";

export const patternsChangedEvent = "storageUpdated";

export const storageKeyFor = (patternId: string) =>
  patternId.startsWith(keyPrefix) ? patternId : `${keyPrefix}${patternId}`;

/** The bare timestamp id, with the storage prefix stripped. */
export const bareIdFor = (patternId: string) =>
  patternId.replace(new RegExp(`^${keyPrefix}`), "");

export const notifyPatternsChanged = () =>
  window.dispatchEvent(new CustomEvent(patternsChangedEvent));

const isStitch = (value: unknown): value is Stitch => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Stitch>;
  return (
    typeof candidate.id === "number" &&
    Array.isArray(candidate.links) &&
    Array.isArray(candidate.colour) &&
    typeof candidate.position === "object" &&
    candidate.position !== null
  );
};

/**
 * Derive a timestamp from the storage key, which has always been
 * `pattern-${Date.now()}`. Used when `savedAt` is missing or unparseable.
 */
const savedAtFromId = (storageKey: string): string => {
  const timestamp = Number(bareIdFor(storageKey));
  return Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp).toISOString()
    : new Date(0).toISOString();
};

const normaliseSavedAt = (value: unknown, storageKey: string): string => {
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return savedAtFromId(storageKey);
};

/**
 * Bring a raw parsed entry up to the current shape, or return undefined if it
 * is too damaged to be worth showing. Unknown future versions are passed
 * through rather than discarded, so a downgrade doesn't destroy data.
 */
const migrate = (
  raw: unknown,
  storageKey: string
): SavedPattern | undefined => {
  if (typeof raw !== "object" || raw === null) return undefined;
  const candidate = raw as Record<string, unknown>;

  const stitches = Array.isArray(candidate.stitches)
    ? candidate.stitches.filter(isStitch)
    : [];
  if (stitches.length === 0) return undefined;

  // `name` could be null here: a bug in earlier builds wrote null when a
  // rename prompt was cancelled. Treat that as "no name".
  const name =
    typeof candidate.name === "string" && candidate.name.length > 0
      ? candidate.name
      : undefined;

  const version =
    typeof candidate.version === "number" ? candidate.version : 1;

  // Before version 4 progress was counted in the hat's own ids, which have no step for the join.
  const progress =
    typeof candidate.progress === "number" && Number.isFinite(candidate.progress)
      ? clampProgress(
          version < 4
            ? progressFromHat(candidate.progress, joinOf(stitches))
            : candidate.progress,
          positionsIn(stitches)
        )
      : 0;

  return {
    version: Math.max(version, currentPatternVersion),
    id: storageKey,
    name,
    savedAt: normaliseSavedAt(candidate.savedAt, storageKey),
    stitches,
    progress,
  };
};

/**
 * How many places progress can be at: every stitch, the phantom stitch 0 that
 * stands for nothing knitted, and joining the round, which is a step of its
 * own (see knitting/hat-knitting).
 */
export const positionsIn = (stitches: Stitch[]): number =>
  stitches.length + (joinOf(stitches) === undefined ? 0 : 1);

/**
 * Progress is a stitch id, so it is only meaningful within the pattern: the
 * last valid value is `stitchCount - 1`. NaN has no sensible clamp and becomes
 * 0; everything else, infinities included, clamps to the ends.
 */
export const clampProgress = (
  progress: number,
  stitchCount: number
): number => {
  if (Number.isNaN(progress)) return 0;
  const highest = Math.max(stitchCount - 1, 0);
  return Math.min(Math.max(Math.round(progress), 0), highest);
};

/**
 * Stitch 0 is the phantom start of the helix and is never knitted, so the
 * number of knittable stitches is one less than the array length. Dividing by
 * the full length would cap a finished hat at 99.99%.
 */
export const knittableStitchCount = (pattern: SavedPattern): number =>
  Math.max(pattern.stitches.length - 1, 0);

/** How many stitches are knitted: progress, less the join once it is done, which is no stitch. */
export const stitchesKnitted = (pattern: SavedPattern): number => {
  const join = joinOf(pattern.stitches);
  const steps = join !== undefined && pattern.progress > join ? 1 : 0;
  return Math.min(Math.max(pattern.progress - steps, 0), knittableStitchCount(pattern));
};

export const percentComplete = (pattern: SavedPattern): number => {
  const knittable = knittableStitchCount(pattern);
  if (knittable === 0) return 0;
  return Math.min((100 * stitchesKnitted(pattern)) / knittable, 100);
};

export const readPattern = (
  patternId: string | undefined
): SavedPattern | undefined => {
  if (!patternId) return undefined;
  const storageKey = storageKeyFor(patternId);
  let stored: string | null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
    return undefined;
  }
  if (!stored) return undefined;
  const kept = read.get(storageKey);
  if (kept?.raw === stored) return kept.pattern;
  let pattern: SavedPattern | undefined;
  try {
    pattern = migrate(JSON.parse(stored), storageKey);
  } catch {
    return undefined;
  }
  if (!pattern) return undefined;
  /*
   * A saved hat's stitches are written once and never change, so the same
   * hat read again - for progress moved on, or a new name - keeps the same
   * stitches, and nothing worked out from them is worked out again: the
   * knitting, the chart, the rounds.
   */
  const before = kept?.pattern;
  if (before && before.savedAt === pattern.savedAt && before.stitches.length === pattern.stitches.length) {
    pattern = { ...pattern, stitches: before.stitches };
  }
  read.set(storageKey, { raw: stored, pattern });
  return pattern;
};

/** The last read of each pattern, by key, as it was stored and as it was read. */
const read = new Map<string, { raw: string; pattern: SavedPattern }>();

/** Newest first. Entries that cannot be read are skipped, not thrown. */
export const listPatterns = (): SavedPattern[] => {
  let keys: string[];
  try {
    keys = Object.keys(localStorage);
  } catch {
    return [];
  }
  return keys
    .filter((key) => key.startsWith(keyPrefix))
    .map((key) => readPattern(key))
    .filter((pattern): pattern is SavedPattern => pattern !== undefined)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
};

export type WriteResult = { ok: true } | { ok: false; reason: "quota" };

const write = (pattern: SavedPattern): WriteResult => {
  const raw = JSON.stringify(pattern);
  try {
    localStorage.setItem(pattern.id, raw);
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    throw error;
  }
  // Read back as written, without parsing it again.
  read.set(pattern.id, { raw, pattern });
  notifyPatternsChanged();
  return { ok: true };
};

export const createPattern = (
  stitches: Stitch[],
  name: string | undefined
): { result: WriteResult; pattern: SavedPattern } => {
  const now = new Date();
  const pattern: SavedPattern = {
    version: currentPatternVersion,
    id: storageKeyFor(now.getTime().toString()),
    name: name && name.length > 0 ? name : undefined,
    savedAt: now.toISOString(),
    stitches,
    progress: 0,
  };
  return { result: write(pattern), pattern };
};

export const renamePattern = (
  patternId: string,
  name: string
): WriteResult | undefined => {
  const pattern = readPattern(patternId);
  if (!pattern) return undefined;
  return write({ ...pattern, name: name.length > 0 ? name : undefined });
};

export const setProgress = (
  patternId: string,
  progress: number
): WriteResult | undefined => {
  const pattern = readPattern(patternId);
  if (!pattern) return undefined;
  return write({
    ...pattern,
    progress: clampProgress(progress, positionsIn(pattern.stitches)),
  });
};

/**
 * Move a pattern's progress on (or back), from the pattern as it is held -
 * without reading it again, which for a hat of ten thousand stitches is most
 * of the time a tap takes.
 */
export const saveProgress = (
  pattern: SavedPattern,
  progress: number
): { result: WriteResult; pattern: SavedPattern } => {
  const next = {
    ...pattern,
    progress: clampProgress(progress, positionsIn(pattern.stitches)),
  };
  return { result: write(next), pattern: next };
};

export const deletePattern = (patternId: string): void => {
  try {
    localStorage.removeItem(storageKeyFor(patternId));
  } catch {
    return;
  }
  // And the time it took, which means nothing without it.
  deleteLog(storageKeyFor(patternId));
  read.delete(storageKeyFor(patternId));
  notifyPatternsChanged();
};

/**
 * A pattern from a backup, saved as a new one beside those already here -
 * under a key of its own, so nothing is ever overwritten - and read in as any
 * stored pattern is, migrated forward and checked. Undefined if it could not
 * be read or saved.
 */
export const restorePattern = (
  raw: unknown,
  at: number
): SavedPattern | undefined => {
  const pattern = migrate(raw, storageKeyFor(String(at)));
  if (!pattern) return undefined;
  return write(pattern).ok ? pattern : undefined;
};

/** Re-persist every readable entry in the current shape. */
export const migrateAllPatterns = (): void => {
  listPatterns().forEach((pattern) => write(pattern));
};
