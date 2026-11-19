import { beforeAll, describe, expect, it } from "vitest";
import { loadGazetteer, placesKnown, searchPlaces } from "./place-search";
import data from "../data/gazetteer.json";

beforeAll(() => loadGazetteer());

describe("the gazetteer", () => {
  it("knows tens of thousands of places", () => {
    expect(data.places.length).toBeGreaterThan(40000);
    expect(placesKnown()).toBeGreaterThan(40000);
  });

  it("has every coordinate in range and every region named", () => {
    for (const [name, region, latitude, longitude] of data.places as [string, number, number, number][]) {
      expect(name.length).toBeGreaterThan(0);
      expect(data.regions[region]?.length).toBeGreaterThan(0);
      expect(Math.abs(latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(longitude)).toBeLessThanOrEqual(180);
    }
  });
});

describe("searching it", () => {
  it("puts the best known of a name first", () => {
    expect(searchPlaces("Paris")[0].region).toBe("Île-de-France, France");
    expect(searchPlaces("Wellington")[0].region).toContain("New Zealand");
    expect(searchPlaces("Lima")[0].region).toContain("Peru");
  });

  it("finds towns the old list never had", () => {
    for (const town of ["Tromsø", "Ouagadougou", "Hobart", "Whanganui", "Ushuaia", "Timbuktu", "Kiruna"]) {
      expect(searchPlaces(town).map((place) => place.name)).toContain(town);
    }
  });

  it("narrows by region after a comma", () => {
    const [first] = searchPlaces("Springfield, Illinois");
    expect(first.name).toBe("Springfield");
    expect(first.region).toBe("Illinois, United States");
    expect(searchPlaces("perth, scotland")[0].region).toContain("Scotland");
  });

  it("still knows the places that are not towns", () => {
    expect(searchPlaces("north pole")[0].name).toBe("North Pole");
    expect(searchPlaces("point nemo")[0].name).toBe("Point Nemo");
    expect(searchPlaces("Mount Everest")[0].name).toBe("Mount Everest");
  });

  it("lists a town once, under the region that knows it best", () => {
    const londons = searchPlaces("London", 20).filter(
      (place) => place.name === "London" && place.region.includes("United Kingdom"),
    );
    expect(londons).toHaveLength(1);
    expect(londons[0].region).toBe("England, United Kingdom");
  });
});
