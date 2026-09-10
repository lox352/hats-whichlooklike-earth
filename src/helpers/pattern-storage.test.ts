import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bareIdFor,
  clampProgress,
  createPattern,
  deletePattern,
  listPatterns,
  percentComplete,
  readPattern,
  renamePattern,
  setProgress,
  storageKeyFor,
} from "./pattern-storage";
import { currentPatternVersion } from "../types/SavedPattern";
import { Stitch } from "../types/Stitch";

const stitch = (id: number, links: number[] = []): Stitch => ({
  id,
  position: { x: id, y: id, z: 0 },
  links,
  fixed: id === 0,
  type: "k1",
  colour: [1, 2, 3],
});

const stitches = (count: number) =>
  Array.from({ length: count }, (_, i) => stitch(i, i === 0 ? [] : [i - 1]));

beforeEach(() => {
  localStorage.clear();
});

describe("key helpers", () => {
  it("adds the prefix once and strips it once", () => {
    expect(storageKeyFor("123")).toBe("pattern-123");
    expect(storageKeyFor("pattern-123")).toBe("pattern-123");
    expect(bareIdFor("pattern-123")).toBe("123");
    expect(bareIdFor("123")).toBe("123");
  });
});

describe("clampProgress", () => {
  it("keeps progress inside the pattern", () => {
    expect(clampProgress(-5, 10)).toBe(0);
    expect(clampProgress(0, 10)).toBe(0);
    expect(clampProgress(5, 10)).toBe(5);
    // Progress is a stitch id, so the last valid value is count - 1.
    expect(clampProgress(10, 10)).toBe(9);
    expect(clampProgress(9999, 10)).toBe(9);
  });

  it("survives nonsense", () => {
    expect(clampProgress(NaN, 10)).toBe(0);
    expect(clampProgress(Infinity, 10)).toBe(9);
    expect(clampProgress(3.7, 10)).toBe(4);
    expect(clampProgress(5, 0)).toBe(0);
  });
});

describe("percentComplete", () => {
  it("does not divide by zero for an empty pattern", () => {
    expect(
      percentComplete({
        version: currentPatternVersion,
        id: "pattern-1",
        savedAt: new Date(0).toISOString(),
        stitches: [],
        progress: 0,
      })
    ).toBe(0);
  });
});

describe("round trip", () => {
  it("saves and reads back a pattern", () => {
    const { result, pattern } = createPattern(stitches(5), "Wellington");
    expect(result.ok).toBe(true);

    const read = readPattern(pattern.id);
    expect(read?.name).toBe("Wellington");
    expect(read?.stitches).toHaveLength(5);
    expect(read?.version).toBe(currentPatternVersion);
    expect(Number.isNaN(Date.parse(read!.savedAt))).toBe(false);
  });

  it("treats an empty name as no name", () => {
    const { pattern } = createPattern(stitches(3), "");
    expect(readPattern(pattern.id)?.name).toBeUndefined();
  });

  it("renames without touching the stitches or progress", () => {
    const { pattern } = createPattern(stitches(6), "Before");
    setProgress(pattern.id, 3);
    renamePattern(pattern.id, "After");

    const read = readPattern(pattern.id);
    expect(read?.name).toBe("After");
    expect(read?.progress).toBe(3);
    expect(read?.stitches).toHaveLength(6);
  });

  it("clamps progress on write", () => {
    const { pattern } = createPattern(stitches(6), "P");
    setProgress(pattern.id, 999);
    expect(readPattern(pattern.id)?.progress).toBe(5);
    setProgress(pattern.id, -20);
    expect(readPattern(pattern.id)?.progress).toBe(0);
  });

  it("deletes", () => {
    const { pattern } = createPattern(stitches(3), "Doomed");
    deletePattern(pattern.id);
    expect(readPattern(pattern.id)).toBeUndefined();
  });

  it("notifies listeners on write and delete", () => {
    const listener = vi.fn();
    window.addEventListener("storageUpdated", listener);
    const { pattern } = createPattern(stitches(3), "P");
    expect(listener).toHaveBeenCalledTimes(1);
    deletePattern(pattern.id);
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener("storageUpdated", listener);
  });
});

describe("listPatterns", () => {
  it("returns newest first", () => {
    localStorage.setItem(
      "pattern-1000",
      JSON.stringify({
        version: currentPatternVersion,
        id: "pattern-1000",
        name: "Oldest",
        savedAt: new Date(1000).toISOString(),
        stitches: stitches(2),
        progress: 0,
      })
    );
    localStorage.setItem(
      "pattern-3000",
      JSON.stringify({
        version: currentPatternVersion,
        id: "pattern-3000",
        name: "Newest",
        savedAt: new Date(3000).toISOString(),
        stitches: stitches(2),
        progress: 0,
      })
    );
    localStorage.setItem(
      "pattern-2000",
      JSON.stringify({
        version: currentPatternVersion,
        id: "pattern-2000",
        name: "Middle",
        savedAt: new Date(2000).toISOString(),
        stitches: stitches(2),
        progress: 0,
      })
    );

    expect(listPatterns().map((p) => p.name)).toEqual([
      "Newest",
      "Middle",
      "Oldest",
    ]);
  });

  it("ignores keys that are not patterns", () => {
    localStorage.setItem("something-else", "not json at all");
    const { pattern } = createPattern(stitches(2), "Mine");
    expect(listPatterns().map((p) => p.id)).toEqual([pattern.id]);
  });

  // The bug this exists to prevent: one bad entry used to throw out of a
  // useState initialiser and white-screen the homepage with no way back.
  it("skips a corrupt entry instead of throwing", () => {
    localStorage.setItem("pattern-500", "{ this is not json");
    localStorage.setItem("pattern-501", JSON.stringify({ nope: true }));
    localStorage.setItem("pattern-502", "null");
    const { pattern } = createPattern(stitches(2), "Good");

    const listed = listPatterns();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(pattern.id);
  });

  it("skips an entry whose stitches are missing or malformed", () => {
    localStorage.setItem(
      "pattern-600",
      JSON.stringify({ id: "pattern-600", stitches: [], progress: 0 })
    );
    localStorage.setItem(
      "pattern-601",
      JSON.stringify({ id: "pattern-601", stitches: [{ nope: 1 }], progress: 0 })
    );
    expect(listPatterns()).toHaveLength(0);
  });
});

describe("migration from version 1", () => {
  /** Exactly what the previous build wrote: no version, savedAt as a Date. */
  const writeLegacy = (
    key: string,
    overrides: Record<string, unknown> = {}
  ) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        id: key,
        name: "Legacy hat",
        savedAt: new Date(1700000000000),
        stitches: stitches(8),
        progress: 4,
        ...overrides,
      })
    );
  };

  it("reads a version 1 entry and stamps the current version", () => {
    writeLegacy("pattern-1700000000000");
    const read = readPattern("pattern-1700000000000");
    expect(read).toBeDefined();
    expect(read?.version).toBe(currentPatternVersion);
    expect(read?.name).toBe("Legacy hat");
    expect(read?.progress).toBe(4);
    expect(read?.stitches).toHaveLength(8);
  });

  it("turns the serialised Date into an ISO string", () => {
    writeLegacy("pattern-1700000000000");
    const read = readPattern("pattern-1700000000000");
    expect(typeof read?.savedAt).toBe("string");
    expect(new Date(read!.savedAt).getTime()).toBe(1700000000000);
  });

  // Older builds wrote null here when a rename prompt was cancelled.
  it("treats a null name from the old rename bug as no name", () => {
    writeLegacy("pattern-1700000000001", { name: null });
    expect(readPattern("pattern-1700000000001")?.name).toBeUndefined();
  });

  it("recovers savedAt from the key when it is missing or unparseable", () => {
    writeLegacy("pattern-1700000000002", { savedAt: undefined });
    expect(new Date(readPattern("pattern-1700000000002")!.savedAt).getTime()).toBe(
      1700000000002
    );

    writeLegacy("pattern-1700000000003", { savedAt: "not a date" });
    expect(new Date(readPattern("pattern-1700000000003")!.savedAt).getTime()).toBe(
      1700000000003
    );
  });

  it("clamps a legacy progress that ran past the end of the pattern", () => {
    writeLegacy("pattern-1700000000004", { progress: 99999 });
    expect(readPattern("pattern-1700000000004")?.progress).toBe(7);
  });

  it("repairs a legacy progress of NaN (serialised as null)", () => {
    writeLegacy("pattern-1700000000005", { progress: NaN });
    expect(readPattern("pattern-1700000000005")?.progress).toBe(0);
  });

  it("does not downgrade an entry written by a newer build", () => {
    writeLegacy("pattern-1700000000006", { version: 99 });
    expect(readPattern("pattern-1700000000006")?.version).toBe(99);
  });
});

describe("quota", () => {
  it("reports a full quota instead of throwing", () => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    try {
      const { result } = createPattern(stitches(3), "Too big");
      expect(result).toEqual({ ok: false, reason: "quota" });
    } finally {
      Storage.prototype.setItem = setItem;
    }
  });
});

describe("percentComplete", () => {
  const pattern = (stitchCount: number, progress: number) => ({
    version: currentPatternVersion,
    id: "pattern-1",
    savedAt: new Date(0).toISOString(),
    stitches: stitches(stitchCount),
    progress,
  });

  // Stitch 0 is the phantom start of the helix and is never knitted, so a
  // finished hat has progress === length - 1 and must read 100%, not 99.99%.
  it("reads 100% when every knittable stitch is done", () => {
    expect(percentComplete(pattern(101, 100))).toBe(100);
  });

  it("reads 0% at the start", () => {
    expect(percentComplete(pattern(101, 0))).toBe(0);
  });

  it("reads 50% halfway", () => {
    expect(percentComplete(pattern(101, 50))).toBeCloseTo(50, 6);
  });

  it("never exceeds 100%", () => {
    expect(percentComplete(pattern(101, 99999))).toBe(100);
  });

  it("handles a single-stitch pattern without dividing by zero", () => {
    expect(percentComplete(pattern(1, 0))).toBe(0);
  });
});
