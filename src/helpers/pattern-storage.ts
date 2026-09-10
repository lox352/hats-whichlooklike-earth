import {
  currentPatternVersion,
  SavedPattern,
} from "../types/SavedPattern";
import { Stitch } from "../types/Stitch";

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

  const progress =
    typeof candidate.progress === "number" && Number.isFinite(candidate.progress)
      ? clampProgress(candidate.progress, stitches.length)
      : 0;

  const version =
    typeof candidate.version === "number" ? candidate.version : 1;

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

export const percentComplete = (pattern: SavedPattern): number => {
  const knittable = knittableStitchCount(pattern);
  if (knittable === 0) return 0;
  return Math.min((100 * pattern.progress) / knittable, 100);
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
  try {
    return migrate(JSON.parse(stored), storageKey);
  } catch {
    return undefined;
  }
};

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
  try {
    localStorage.setItem(pattern.id, JSON.stringify(pattern));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    throw error;
  }
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
    progress: clampProgress(progress, pattern.stitches.length),
  });
};

export const deletePattern = (patternId: string): void => {
  try {
    localStorage.removeItem(storageKeyFor(patternId));
  } catch {
    return;
  }
  notifyPatternsChanged();
};

/** Re-persist every readable entry in the current shape. */
export const migrateAllPatterns = (): void => {
  listPatterns().forEach((pattern) => write(pattern));
};
