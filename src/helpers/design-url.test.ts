import { describe, expect, it } from "vitest";
import {
  designFromSearchParams,
  designKey,
  designToSearchParams,
} from "./design-url";
import { defaultHatDesign, HatDesign } from "../types/HatDesign";

const wellington: HatDesign = {
  stitchesPerRow: 180,
  numberOfRows: 40,
  decreaseMethod: "Hemispherical",
  orientation: {
    coordinates: { latitude: -41.29, longitude: 174.78 },
    targetDestination: "front",
    displayNewZealand: false,
  },
};

describe("design URL round trip", () => {
  it.each([defaultHatDesign, wellington])(
    "survives a round trip",
    (design) => {
      const back = designFromSearchParams(designToSearchParams(design));
      expect(back).toEqual(design);
    }
  );

  it("produces a shareable query string", () => {
    const params = designToSearchParams(wellington);
    expect(params.get("sts")).toBe("180");
    expect(params.get("rows")).toBe("40");
    expect(params.get("dec")).toBe("Hemispherical");
    expect(params.get("lat")).toBe("-41.29");
    expect(params.get("lon")).toBe("174.78");
    expect(params.get("to")).toBe("front");
    expect(params.get("nz")).toBe("0");
  });

  it("keeps coordinates to a precision finer than a stitch", () => {
    const design = {
      ...wellington,
      orientation: {
        ...wellington.orientation,
        coordinates: { latitude: -41.2865432, longitude: 174.7762351 },
      },
    };
    const back = designFromSearchParams(designToSearchParams(design));
    expect(back.orientation.coordinates.latitude).toBeCloseTo(-41.29, 2);
    expect(back.orientation.coordinates.longitude).toBeCloseTo(174.78, 2);
  });
});

/**
 * A link is untrusted input. Every one of these used to be a way to get a
 * broken hat or a crash, so each falls back instead.
 */
describe("design URL is defensive", () => {
  it("falls back on an empty query string", () => {
    expect(designFromSearchParams(new URLSearchParams())).toEqual(
      defaultHatDesign
    );
  });

  it.each([
    "sts=abc",
    "sts=",
    "sts=NaN",
    "rows=Infinity",
    "rows=-5",
    "lat=hello",
    "lon=",
  ])("falls back on garbage: %s", (query) => {
    const design = designFromSearchParams(new URLSearchParams(query));
    expect(Number.isFinite(design.stitchesPerRow)).toBe(true);
    expect(Number.isFinite(design.numberOfRows)).toBe(true);
    expect(Number.isFinite(design.orientation.coordinates.latitude)).toBe(true);
    expect(Number.isFinite(design.orientation.coordinates.longitude)).toBe(true);
  });

  it("clamps coordinates into range", () => {
    const design = designFromSearchParams(
      new URLSearchParams("lat=999&lon=-999")
    );
    expect(design.orientation.coordinates.latitude).toBe(90);
    expect(design.orientation.coordinates.longitude).toBe(-180);
  });

  it("rejects an unknown decrease method or destination", () => {
    const design = designFromSearchParams(
      new URLSearchParams("dec=Spiral&to=brim")
    );
    expect(design.decreaseMethod).toBe(defaultHatDesign.decreaseMethod);
    expect(design.orientation.targetDestination).toBe(
      defaultHatDesign.orientation.targetDestination
    );
  });

  it("never returns a fractional stitch or row count", () => {
    const design = designFromSearchParams(
      new URLSearchParams("sts=160.7&rows=35.2")
    );
    expect(Number.isInteger(design.stitchesPerRow)).toBe(true);
    expect(Number.isInteger(design.numberOfRows)).toBe(true);
  });

  it("reads the New Zealand flag either way round", () => {
    expect(
      designFromSearchParams(new URLSearchParams("nz=0")).orientation
        .displayNewZealand
    ).toBe(false);
    expect(
      designFromSearchParams(new URLSearchParams("nz=1")).orientation
        .displayNewZealand
    ).toBe(true);
  });
});

describe("designKey", () => {
  it("matches for equal designs and differs for different ones", () => {
    expect(designKey(wellington)).toBe(designKey({ ...wellington }));
    expect(designKey(wellington)).not.toBe(
      designKey({ ...wellington, numberOfRows: 41 })
    );
    expect(designKey(wellington)).not.toBe(
      designKey({
        ...wellington,
        orientation: {
          ...wellington.orientation,
          displayNewZealand: !wellington.orientation.displayNewZealand,
        },
      })
    );
  });
});
