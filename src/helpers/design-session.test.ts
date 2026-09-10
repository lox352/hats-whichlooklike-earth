import { beforeEach, describe, expect, it } from "vitest";
import { cacheDyedHat, clearDyedHat, readDyedHat } from "./design-session";
import { defaultHatDesign, HatDesign } from "../types/HatDesign";
import { Stitch } from "../types/Stitch";

const stitches = (count: number): Stitch[] =>
  Array.from({ length: count }, (_, id) => ({
    id,
    position: { x: id, y: id, z: 0 },
    links: id === 0 ? [] : [id - 1],
    fixed: id === 0,
    type: "k1" as const,
    colour: [1, 2, 3] as [number, number, number],
  }));

const otherDesign: HatDesign = {
  ...defaultHatDesign,
  numberOfRows: defaultHatDesign.numberOfRows + 1,
};

beforeEach(() => {
  sessionStorage.clear();
});

describe("dyed hat cache", () => {
  it("returns the hat it was given", () => {
    cacheDyedHat(defaultHatDesign, stitches(10));
    expect(readDyedHat(defaultHatDesign)).toHaveLength(10);
  });

  // The whole point of keying by design: a cached hat must never be shown for
  // a different design.
  it("misses for a different design", () => {
    cacheDyedHat(defaultHatDesign, stitches(10));
    expect(readDyedHat(otherDesign)).toBeUndefined();
  });

  it("misses when nothing has been cached", () => {
    expect(readDyedHat(defaultHatDesign)).toBeUndefined();
  });

  it("does not cache an empty hat", () => {
    cacheDyedHat(defaultHatDesign, []);
    expect(readDyedHat(defaultHatDesign)).toBeUndefined();
  });

  it("clears", () => {
    cacheDyedHat(defaultHatDesign, stitches(4));
    clearDyedHat();
    expect(readDyedHat(defaultHatDesign)).toBeUndefined();
  });

  it("survives a corrupt entry instead of throwing", () => {
    sessionStorage.setItem("in-progress-hat", "{ not json");
    expect(() => readDyedHat(defaultHatDesign)).not.toThrow();
    expect(readDyedHat(defaultHatDesign)).toBeUndefined();
  });

  it("survives an entry with no stitches", () => {
    sessionStorage.setItem(
      "in-progress-hat",
      JSON.stringify({ key: "whatever", stitches: null })
    );
    expect(readDyedHat(defaultHatDesign)).toBeUndefined();
  });

  it("reports a full quota by simply not caching", () => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    try {
      expect(() => cacheDyedHat(defaultHatDesign, stitches(4))).not.toThrow();
    } finally {
      Storage.prototype.setItem = setItem;
    }
  });
});
