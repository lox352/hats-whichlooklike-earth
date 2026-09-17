import { describe, expect, it } from "vitest";
import {
  clampToUnit,
  dyeOne,
  getGlobalCoordinates,
  globeCoordinatesForStitch,
  isNewZealand,
  rotateToDestination,
} from "./node-colouring";
import { decodeRegionLabels, regionAt } from "./earth-regions";
import { regionDescriptions } from "../data/region-names";
import { GlobeRaster } from "./raster-colouring";
import labels from "../assets/region-labels.rle?raw";
import { OrientationParameters } from "../types/OrientationParameters";
import DestinationType from "../types/DestinationType";

/**
 * rotateToDestination maps *hat* coordinates onto the globe, so these tests
 * assert the inverse property that actually matters: the anchor point for the
 * chosen destination must land exactly on the coordinate the user picked.
 *
 * This is easy to "fix" into being wrong, hence the coverage.
 */
const hatAnchors: Record<DestinationType, { latitude: number; longitude: number }> =
  {
    crown: { latitude: 90, longitude: 0 },
    front: { latitude: 0, longitude: 0 },
    rim: { latitude: -90, longitude: 0 },
  };

const places = [
  { name: "North Pole", latitude: 90, longitude: 0 },
  { name: "South Pole", latitude: -90, longitude: 180 },
  { name: "Wellington", latitude: -41.3, longitude: 174.8 },
  { name: "London", latitude: 51.5, longitude: -0.13 },
  { name: "Quito", latitude: -0.18, longitude: -78.47 },
  { name: "Anchorage", latitude: 61.2, longitude: -149.9 },
];

describe("rotateToDestination", () => {
  const destinations: DestinationType[] = ["crown", "front", "rim"];

  destinations.forEach((destination) => {
    places.forEach((place) => {
      it(`carries the ${destination} anchor to ${place.name}`, () => {
        const orientationParameters: OrientationParameters = {
          coordinates: { latitude: place.latitude, longitude: place.longitude },
          targetDestination: destination,
          displayNewZealand: true,
        };

        const result = rotateToDestination(
          hatAnchors[destination],
          orientationParameters
        );

        expect(result.latitude).toBeCloseTo(place.latitude, 6);
        // At the poles longitude is degenerate, so only check it elsewhere.
        if (Math.abs(place.latitude) < 89.9) {
          expect(result.longitude).toBeCloseTo(place.longitude, 6);
        }
      });
    });
  });

  it("keeps longitude inside [-180, 180] when the rotation wraps", () => {
    const result = rotateToDestination(
      { latitude: 0, longitude: 170 },
      {
        coordinates: { latitude: 0, longitude: 170 },
        targetDestination: "front",
        displayNewZealand: true,
      }
    );
    expect(result.longitude).toBeGreaterThanOrEqual(-180);
    expect(result.longitude).toBeLessThanOrEqual(180);
  });

  it("rejects an unknown destination rather than silently mis-orienting", () => {
    expect(() =>
      rotateToDestination(
        { latitude: 0, longitude: 0 },
        {
          coordinates: { latitude: 0, longitude: 0 },
          targetDestination: "brim" as DestinationType,
          displayNewZealand: true,
        }
      )
    ).toThrow(/Invalid target destination/);
  });
});

describe("clampToUnit", () => {
  it.each([
    [0, 0],
    [1, 1],
    [-1, -1],
    [1.0000001, 1],
    [-2, -1],
    [5, 1],
  ])("clamps %s to %s", (input, expected) => {
    expect(clampToUnit(input)).toBe(expected);
  });

  it("maps non-finite input to zero rather than propagating NaN", () => {
    expect(clampToUnit(NaN)).toBe(0);
    expect(clampToUnit(Infinity)).toBe(1);
    expect(clampToUnit(-Infinity)).toBe(-1);
  });
});

describe("getGlobalCoordinates", () => {
  const maxY = 56;

  it("puts the top of the hat at the north pole", () => {
    const { latitude } = getGlobalCoordinates({ x: 0, y: maxY, z: 0 }, maxY);
    expect(latitude).toBeCloseTo(90, 6);
  });

  it("puts the equator halfway up", () => {
    const { latitude } = getGlobalCoordinates(
      { x: 50, y: maxY / 2, z: 0 },
      maxY
    );
    expect(latitude).toBeCloseTo(0, 6);
  });

  it("puts the rim at the south pole", () => {
    const { latitude } = getGlobalCoordinates({ x: 50, y: 0, z: 0 }, maxY);
    expect(latitude).toBeCloseTo(-90, 6);
  });

  // Before the clamp, y < 0 produced asin(x < -1) = NaN. NaN then passed the
  // range check downstream (every comparison with NaN is false) and silently
  // turned the stitch black.
  it.each([-1, -5, -1000])(
    "returns a usable latitude for a stitch below the rim (y = %s)",
    (y) => {
      const { latitude, longitude } = getGlobalCoordinates({ x: 50, y, z: 0 }, maxY);
      expect(Number.isFinite(latitude)).toBe(true);
      expect(Number.isFinite(longitude)).toBe(true);
      expect(latitude).toBeGreaterThanOrEqual(-90);
      expect(latitude).toBeLessThanOrEqual(90);
    }
  );

  it("never returns out-of-range coordinates anywhere on a hat-shaped cloud", () => {
    for (let y = -10; y <= maxY + 10; y += 1.5) {
      for (let angle = 0; angle < 360; angle += 15) {
        const radians = (angle * Math.PI) / 180;
        const { latitude, longitude } = getGlobalCoordinates(
          { x: 50 * Math.cos(radians), y, z: 50 * Math.sin(radians) },
          maxY
        );
        expect(Number.isFinite(latitude) && Number.isFinite(longitude)).toBe(
          true
        );
        expect(latitude).toBeGreaterThanOrEqual(-90.000001);
        expect(latitude).toBeLessThanOrEqual(90.000001);
        expect(longitude).toBeGreaterThanOrEqual(-180.000001);
        expect(longitude).toBeLessThanOrEqual(180.000001);
      }
    }
  });

  it("tolerates a degenerate position at the origin", () => {
    const { latitude, longitude } = getGlobalCoordinates(
      { x: 0, y: 0, z: 0 },
      0
    );
    expect(Number.isFinite(latitude)).toBe(true);
    expect(Number.isFinite(longitude)).toBe(true);
  });
});

describe("isNewZealand", () => {
  it("covers Wellington and Auckland", () => {
    expect(isNewZealand({ latitude: -41.3, longitude: 174.8 })).toBe(true);
    expect(isNewZealand({ latitude: -36.85, longitude: 174.76 })).toBe(true);
  });

  it("does not cover Sydney or Fiji", () => {
    expect(isNewZealand({ latitude: -33.87, longitude: 151.2 })).toBe(false);
    expect(isNewZealand({ latitude: -17.7, longitude: 178.0 })).toBe(false);
  });
});

describe("dyeOne", () => {
  const regions = decodeRegionLabels(labels);

  /*
   * A globe painted entirely land, so the sea a hidden New Zealand is given
   * cannot be confused with a colour that was read from the raster.
   */
  const allLand: GlobeRaster = {
    width: 4,
    height: 2,
    samplesPerPixel: 3,
    rasterData: new Uint8Array(
      Array.from({ length: 8 }, () => [178, 200, 169]).flat()
    ),
  };

  /*
   * The crown of the hat lands exactly on the coordinate the design is
   * pointed at, so the topmost stitch is a way of asking about one place.
   */
  const maxY = 2;
  const crown = { x: 0, y: maxY, z: 0 };
  const pointedAt = (
    latitude: number,
    longitude: number,
    displayNewZealand = true
  ) => ({
    coordinates: { latitude, longitude },
    targetDestination: "crown" as const,
    displayNewZealand,
  });

  it("reads the colour and the region from one coordinate", () => {
    for (const [latitude, longitude] of [
      [51.51, -0.13],
      [-15.79, -47.88],
      [30, -40],
      [35.68, 139.69],
    ]) {
      const orientation = pointedAt(latitude, longitude);
      const dyed = dyeOne(allLand, regions, crown, maxY, orientation);
      const coordinates = globeCoordinatesForStitch(crown, maxY, orientation);
      expect(dyed.region).toBe(regionAt(regions, coordinates));
    }
  });

  it("labels a hat that has no labels loaded with nothing at all", () => {
    const dyed = dyeOne(allLand, undefined, crown, maxY, pointedAt(51.51, -0.13));
    expect(dyed.region).toBeUndefined();
    expect(dyed.colour).toEqual([178, 200, 169]);
  });

  // Inland: the coast averages into the sea at a third of a degree, and a
  // stitch knitted blue is named for the water, not the country.
  it("names New Zealand when the hat is showing it", () => {
    const dyed = dyeOne(allLand, regions, crown, maxY, pointedAt(-43.6, 171.6));
    expect(dyed.region).toBe("NZL");
  });

  /*
   * The invariant the whole feature rests on: a stitch may never say it is
   * somewhere the hat is not painting. Hiding New Zealand paints it sea, so
   * the label has to be sea too.
   */
  it("paints a hidden New Zealand as sea and labels it as sea", () => {
    const orientation = pointedAt(-43.6, 171.6, false);
    const dyed = dyeOne(allLand, regions, crown, maxY, orientation);
    expect(dyed.colour).toEqual([119, 159, 196]);
    expect(dyed.region).toBeDefined();
    expect(regionDescriptions[dyed.region as string].kind).not.toBe("country");
  });

  it("leaves the rest of the world alone when New Zealand is hidden", () => {
    const orientation = pointedAt(51.51, -0.13, false);
    const dyed = dyeOne(allLand, regions, crown, maxY, orientation);
    expect(dyed.colour).toEqual([178, 200, 169]);
    expect(dyed.region).toBe("GBR");
  });
});
