import DestinationType from "../types/DestinationType";
import { DecreaseMethod } from "../types/KnittingMachine";
import { defaultHatDesign, HatDesign } from "../types/HatDesign";

/**
 * Reads and writes a hat design as URL query parameters, so a design can be
 * shared as a link and survives a refresh.
 *
 * Keys are kept short because these end up in a hash route, and every value is
 * validated on the way back in: a link is untrusted input, and a bad number
 * must fall back rather than produce a broken hat.
 */

const keys = {
  stitchesPerRow: "sts",
  numberOfRows: "rows",
  decreaseMethod: "dec",
  latitude: "lat",
  longitude: "lon",
  destination: "to",
  newZealand: "nz",
} as const;

const decreaseMethods: DecreaseMethod[] = ["Hemispherical", "Pyramidal"];
const destinations: DestinationType[] = ["crown", "front", "rim"];

const readNumber = (
  params: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number
): number => {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
};

export const designToSearchParams = (design: HatDesign): URLSearchParams => {
  const params = new URLSearchParams();
  params.set(keys.stitchesPerRow, String(design.stitchesPerRow));
  params.set(keys.numberOfRows, String(design.numberOfRows));
  params.set(keys.decreaseMethod, design.decreaseMethod);
  // Two decimals is ~1km on the ground, which is far finer than a stitch.
  params.set(keys.latitude, design.orientation.coordinates.latitude.toFixed(2));
  params.set(
    keys.longitude,
    design.orientation.coordinates.longitude.toFixed(2)
  );
  params.set(keys.destination, design.orientation.targetDestination);
  params.set(keys.newZealand, design.orientation.displayNewZealand ? "1" : "0");
  return params;
};

export const designFromSearchParams = (
  params: URLSearchParams,
  fallback: HatDesign = defaultHatDesign
): HatDesign => {
  const decreaseRaw = params.get(keys.decreaseMethod);
  const decreaseMethod = decreaseMethods.includes(decreaseRaw as DecreaseMethod)
    ? (decreaseRaw as DecreaseMethod)
    : fallback.decreaseMethod;

  const destinationRaw = params.get(keys.destination);
  const targetDestination = destinations.includes(
    destinationRaw as DestinationType
  )
    ? (destinationRaw as DestinationType)
    : fallback.orientation.targetDestination;

  const newZealandRaw = params.get(keys.newZealand);

  return {
    // Generous bounds: validateDesign reports the real limits to the user, so
    // clamping here only needs to keep the numbers sane.
    stitchesPerRow: Math.round(
      readNumber(params, keys.stitchesPerRow, fallback.stitchesPerRow, 0, 2000)
    ),
    numberOfRows: Math.round(
      readNumber(params, keys.numberOfRows, fallback.numberOfRows, 0, 2000)
    ),
    decreaseMethod,
    orientation: {
      coordinates: {
        latitude: readNumber(
          params,
          keys.latitude,
          fallback.orientation.coordinates.latitude,
          -90,
          90
        ),
        longitude: readNumber(
          params,
          keys.longitude,
          fallback.orientation.coordinates.longitude,
          -180,
          180
        ),
      },
      targetDestination,
      displayNewZealand:
        newZealandRaw === null
          ? fallback.orientation.displayNewZealand
          : newZealandRaw !== "0",
    },
  };
};

/**
 * A stable identity for a design, used to tell whether a hat cached from an
 * earlier visit still matches the design being asked for.
 */
export const designKey = (design: HatDesign): string =>
  designToSearchParams(design).toString();
