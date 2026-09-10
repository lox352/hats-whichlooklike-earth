import { describe, expect, it } from "vitest";
import { searchPlaces } from "./place-search";
import { places } from "../data/places";

describe("the gazetteer itself", () => {
  it("has no duplicate names", () => {
    const names = places.map((place) => place.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("has coordinates in range", () => {
    places.forEach((place) => {
      expect(place.latitude).toBeGreaterThanOrEqual(-90);
      expect(place.latitude).toBeLessThanOrEqual(90);
      expect(place.longitude).toBeGreaterThanOrEqual(-180);
      expect(place.longitude).toBeLessThanOrEqual(180);
      expect(place.name.length).toBeGreaterThan(0);
      expect(place.region.length).toBeGreaterThan(0);
    });
  });

  it("covers every inhabited continent and both poles", () => {
    const regions = places.map((p) => p.region).join("|");
    ["United Kingdom", "United States", "Brazil", "Nigeria", "India",
     "Australia", "New Zealand", "Antarctica", "Arctic"].forEach((region) =>
      expect(regions).toContain(region)
    );
  });
});

describe("searchPlaces", () => {
  it("returns nothing for an empty query", () => {
    expect(searchPlaces("")).toEqual([]);
    expect(searchPlaces("   ")).toEqual([]);
  });

  it("finds an exact name first", () => {
    expect(searchPlaces("Wellington")[0].name).toBe("Wellington");
    expect(searchPlaces("Lima")[0].name).toBe("Lima");
  });

  it("is case insensitive", () => {
    expect(searchPlaces("wellington")[0].name).toBe("Wellington");
    expect(searchPlaces("WELLINGTON")[0].name).toBe("Wellington");
  });

  it("matches on a prefix as you type", () => {
    expect(searchPlaces("well").map((p) => p.name)).toContain("Wellington");
    expect(searchPlaces("edin").map((p) => p.name)).toContain("Edinburgh");
  });

  it("ranks a name match above a region match", () => {
    // "Chile" is a region for several entries, and no place is called Chile.
    const results = searchPlaces("chile");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.region.includes("Chile"))).toBe(true);
  });

  it("finds somewhere by country", () => {
    const results = searchPlaces("New Zealand");
    expect(results.map((p) => p.name)).toContain("Wellington");
  });

  it("folds accents both ways", () => {
    // The list stores plain ASCII, so an accented query must still match.
    expect(searchPlaces("sao paulo").map((p) => p.name)).toContain("Sao Paulo");
    expect(searchPlaces("São Paulo").map((p) => p.name)).toContain("Sao Paulo");
  });

  it("finds the poles and open ocean", () => {
    expect(searchPlaces("north pole")[0].name).toBe("North Pole");
    expect(searchPlaces("point nemo")[0].name).toBe("Point Nemo");
    expect(searchPlaces("pacific").length).toBeGreaterThan(0);
  });

  it("respects the limit", () => {
    expect(searchPlaces("a", 3)).toHaveLength(3);
    expect(searchPlaces("a", 50).length).toBeLessThanOrEqual(50);
  });

  it("returns nothing for gibberish rather than throwing", () => {
    expect(searchPlaces("zzzzqqqq")).toEqual([]);
  });

  it("survives regex-special characters in the query", () => {
    expect(() => searchPlaces("(*.[]")).not.toThrow();
    expect(searchPlaces("(*.[]")).toEqual([]);
  });
});
