import { describe, expect, it } from "vitest";
import {
  decodeRegionLabels,
  marineRegionNear,
  regionAt,
  RegionRaster,
} from "./earth-regions";
import { regionDescriptions } from "../data/region-names";
import reference from "./__fixtures__/earth-regions.json";
import labels from "../assets/region-labels.rle?raw";

/*
 * The raster is an asset, fetched by URL in the browser, which jsdom cannot
 * serve. `?raw` hands over the committed file's own text instead: the same
 * bytes the app ships, which is the point of testing it.
 */
const raster: RegionRaster = decodeRegionLabels(labels);

const at = (latitude: number, longitude: number) =>
  regionAt(raster, { latitude, longitude });

describe("decodeRegionLabels", () => {
  const good = ["region-labels 1", "2 2 2", "SEA LND", "0:1 1:2 0:1"].join("\n");

  it("decodes a small raster row by row from the north-west", () => {
    const small = decodeRegionLabels(good);
    expect(small.width).toBe(2);
    expect(small.height).toBe(2);
    expect(small.keys).toEqual(["SEA", "LND"]);
    expect([...small.cells]).toEqual([0, 1, 1, 0]);
  });

  it("lets a run cross the end of a row, since decoding is positional", () => {
    const crossing = ["region-labels 1", "2 2 2", "SEA LND", "1:4"].join("\n");
    expect([...decodeRegionLabels(crossing).cells]).toEqual([1, 1, 1, 1]);
  });

  it("refuses anything that is not this format", () => {
    expect(() => decodeRegionLabels("region-labels 2\n2 2 2\nA B\n0:4")).toThrow();
    expect(() => decodeRegionLabels("")).toThrow();
  });

  it("refuses a raster whose runs do not fill it exactly", () => {
    expect(() =>
      decodeRegionLabels(["region-labels 1", "2 2 2", "SEA LND", "0:3"].join("\n"))
    ).toThrow(/covers 3 cells of 4/);
    expect(() =>
      decodeRegionLabels(["region-labels 1", "2 2 2", "SEA LND", "0:9"].join("\n"))
    ).toThrow(/more cells than its dimensions allow/);
  });

  it("refuses a run naming a region it does not list", () => {
    expect(() =>
      decodeRegionLabels(["region-labels 1", "2 2 2", "SEA LND", "0:3 7:1"].join("\n"))
    ).toThrow(/region 7/);
  });

  it("refuses a key list that does not match the promised count", () => {
    expect(() =>
      decodeRegionLabels(["region-labels 1", "2 2 3", "SEA LND", "0:4"].join("\n"))
    ).toThrow(/promised 3 regions and lists 2/);
  });
});

describe("regionAt", () => {
  /*
   * The reference points were classified by ray casting over the source
   * GeoJSON, a different algorithm from the scanline fill that burned the
   * raster, so this is a real check of the grid against the polygons rather
   * than the generator agreeing with itself. Points near a boundary, and
   * points whose cell was settled by the flood fill, are not in the fixture:
   * see scripts/region-reference.py.
   */
  it("agrees with the source polygons at every reference point", () => {
    expect(reference.source).toBeTruthy();
    expect(reference.points.length).toBeGreaterThan(1000);

    const seen = new Set<string>();
    for (const [longitude, latitude, expected] of reference.points) {
      const actual = at(Number(latitude), Number(longitude));
      expect(actual, `${longitude}°, ${latitude}°`).toBe(expected);
      seen.add(actual);
    }
    expect(seen.size).toBeGreaterThan(100);
  });

  it("puts well-known places where they belong", () => {
    expect(at(51.51, -0.13)).toBe("GBR");
    expect(at(48.86, 2.35)).toBe("FRA");
    expect(at(27.72, 85.32)).toBe("NPL");
    expect(at(-15.79, -47.88)).toBe("BRA");
    expect(at(64.9, -18.6)).toBe("ISL");
  });

  /*
   * A place the globe raster does not paint as land is not on the hat to be
   * named. Hawaii and Singapore average into the sea around them at a third
   * of a degree, so those stitches are knitted blue - and a blue stitch is
   * named as water, whatever the map says is under it.
   */
  it("gives an island too small to be painted the sea it is knitted as", () => {
    expect(at(19.6, -155.5)).toBe("north-pacific-ocean");
    expect(at(1.35, 103.82)).toBe("south-china-sea");
  });

  /*
   * The lakes come out the other way round: the globe raster paints the
   * Great Lakes and Baikal the same green as the land, so those stitches are
   * knitted green and named for the country around them.
   */
  it("names inland water for its country, because that is how it is knitted", () => {
    expect(at(44.5, -82.5)).toBe("USA");
    expect(at(53.5, 108)).toBe("RUS");
  });

  it("names the water as well as the land", () => {
    expect(at(30, -40)).toBe("north-atlantic-ocean");
    expect(at(35, 18)).toBe("mediterranean-sea");
    expect(at(42, 51)).toBe("caspian-sea");
    expect(at(60, -85)).toBe("hudson-bay");
    expect(at(-18, 153)).toBe("coral-sea");
  });

  it("covers the poles, where a hat's crown and rim land", () => {
    expect(at(90, 0)).toBe("arctic-ocean");
    expect(at(-90, 0)).toBe("ATA");
    expect(at(-72, -175)).toBe("ross-sea");
  });

  /*
   * The two sides of the date line are the same meridian but not the same
   * cell: the raster has a first column and a last one, and both lookups
   * clamp to the nearer of them rather than wrapping, because that is what
   * colourAt does and the colour and the label have to agree.
   */
  it("has a region on both sides of the date line", () => {
    for (const latitude of [-60, -12, 0, 31, 70]) {
      expect(regionDescriptions[at(latitude, 180)]).toBeDefined();
      expect(regionDescriptions[at(latitude, -180)]).toBeDefined();
    }
  });

  it("has an answer everywhere, because the globe is tiled", () => {
    for (let latitude = -90; latitude <= 90; latitude += 1.5) {
      for (let longitude = -180; longitude <= 180; longitude += 1.5) {
        const key = at(latitude, longitude);
        expect(key, `${longitude}°, ${latitude}°`).toBeTruthy();
        expect(regionDescriptions[key], key).toBeDefined();
      }
    }
  });

  it("refuses a coordinate that is not on the globe", () => {
    expect(() => at(NaN, 0)).toThrow();
    expect(() => at(0, Infinity)).toThrow();
    expect(() => at(91, 0)).toThrow();
    expect(() => at(0, 181)).toThrow();
  });
});

describe("marineRegionNear", () => {
  it("gives back the water a point is already in", () => {
    expect(marineRegionNear(raster, { latitude: 30, longitude: -40 })).toBe(
      "north-atlantic-ocean"
    );
  });

  /*
   * The hat that hides New Zealand paints it sea, so the label has to say sea
   * too. isNewZealand's box is -50..-34, 165..180.
   */
  it("finds water from anywhere in the New Zealand box", () => {
    for (let latitude = -49; latitude < -34; latitude += 1) {
      for (let longitude = 166; longitude < 180; longitude += 1) {
        const key = marineRegionNear(raster, { latitude, longitude });
        expect(regionDescriptions[key]?.kind, `${longitude}°, ${latitude}°`).not.toBe(
          "country"
        );
      }
    }
  });

  it("finds water from the middle of a continent, though it is far", () => {
    const key = marineRegionNear(raster, { latitude: 48, longitude: 90 });
    expect(regionDescriptions[key]?.kind).not.toBe("country");
  });
});

describe("the committed data", () => {
  it("names every region the raster uses, and uses every region it names", () => {
    expect(new Set(raster.keys)).toEqual(new Set(Object.keys(regionDescriptions)));
  });

  it("gives every region something to call it", () => {
    for (const [key, description] of Object.entries(regionDescriptions)) {
      expect(description.name, key).toBeTruthy();
      expect(description.where, key).not.toContain("Seven seas");
    }
  });

  it("uses every region it lists in at least one cell", () => {
    const used = new Set(raster.cells);
    for (let index = 0; index < raster.keys.length; index++) {
      expect(used.has(index), raster.keys[index]).toBe(true);
    }
  });
});
