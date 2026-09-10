import { describe, expect, it } from "vitest";
import {
  clampToUnit,
  getGlobalCoordinates,
  isNewZealand,
  rotateToDestination,
} from "./node-colouring";
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
