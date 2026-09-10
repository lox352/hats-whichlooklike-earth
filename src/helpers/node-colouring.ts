import { Point } from "../types/Point";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { colourAt, loadGlobe, Palette } from "./raster-colouring";
import { type RGB } from "../types/RGB";
import { OrientationParameters } from "../types/OrientationParameters";

/** Colour used when a stitch cannot be placed on the globe at all. */
const unknownColour: RGB = Palette.Blue;

/**
 * asin/acos are only defined on [-1, 1], and float error can push us just
 * past. NaN is the one input with no sensible clamp, so it becomes 0;
 * infinities clamp to the interval ends like any other out-of-range value.
 */
const clampToUnit = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, -1), 1);
};

function rotateAboutAxis(
  coord: GlobalCoordinates,
  angle: number
): GlobalCoordinates {
  const { latitude, longitude } = coord;
  const newLongitude = longitude + angle;
  if (newLongitude > 180) {
    return { latitude, longitude: newLongitude - 360 };
  }
  if (newLongitude < -180) {
    return { latitude, longitude: newLongitude + 360 };
  }
  return { latitude, longitude: newLongitude };
}

/**
 * Rotates the unit sphere about the axis through {lat 0, lon +/-90}, which
 * slides points along the lon = 0 meridian. A point at {lat: t, lon: 0} ends up
 * at {lat: t + angleInDegrees, lon: 0}.
 *
 * Note this *adds* to the latitude rather than zeroing it. That is deliberate:
 * see rotateToDestination, which maps hat coordinates onto the globe (the
 * inverse of what you might expect), and relies on this direction.
 */
function rotateVertically(
  coord: GlobalCoordinates,
  angleInDegrees: number
): GlobalCoordinates {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;

  const latRad = toRadians(coord.latitude);
  const lonRad = toRadians(coord.longitude);
  const angleRad = toRadians(angleInDegrees);

  const sinAngle = Math.sin(angleRad);
  const cosAngle = Math.cos(angleRad);

  const x = Math.cos(latRad) * Math.cos(lonRad);
  const y = Math.cos(latRad) * Math.sin(lonRad);
  const z = Math.sin(latRad);

  // Rotation about the y axis.
  const xRot = cosAngle * x - sinAngle * z;
  const yRot = y;
  const zRot = sinAngle * x + cosAngle * z;

  return {
    latitude: toDegrees(Math.asin(clampToUnit(zRot))),
    longitude: toDegrees(Math.atan2(yRot, xRot)),
  };
}

/**
 * Maps a coordinate in *hat space* to the coordinate on the globe that should
 * be sampled for it, such that the user's chosen point lands on their chosen
 * part of the hat.
 *
 * Because this is the inverse mapping, latitude is applied first and longitude
 * second. The three anchors in hat space are: crown = {90, 0}, front = {0, 0},
 * rim = {-90, 0}; each is carried to the target coordinate.
 */
function rotateToDestination(
  coord: GlobalCoordinates,
  orientationParameters: OrientationParameters
): GlobalCoordinates {
  const { latitude: targetLatitude, longitude: targetLongitude } =
    orientationParameters.coordinates;

  let rotatedCoord;
  switch (orientationParameters.targetDestination) {
    case "front":
      rotatedCoord = rotateVertically(coord, targetLatitude);
      break;
    case "crown":
      rotatedCoord = rotateVertically(coord, targetLatitude - 90);
      break;
    case "rim":
      rotatedCoord = rotateVertically(coord, targetLatitude + 90);
      break;
    default:
      throw new Error(
        `Invalid target destination: ${orientationParameters.targetDestination}`
      );
  }

  return rotateAboutAxis(rotatedCoord, targetLongitude);
}

const getGlobalCoordinates = (
  position: Point,
  maxY: number
): GlobalCoordinates => {
  const { x, y, z } = position;
  const equatorY = maxY / 2;
  const heightAboveEquator = y - equatorY;
  const radius = Math.sqrt(
    x * x + heightAboveEquator * heightAboveEquator + z * z
  );

  // Longitude is the same in both projections below.
  const longitudeDegrees =
    radius === 0 ? 0 : Math.atan2(z / radius, -x / radius) * (180 / Math.PI);

  if (y > equatorY) {
    // Above the equator the hat is roughly a dome, so project spherically.
    const latitudeDegrees =
      radius === 0
        ? 90
        : Math.asin(clampToUnit(heightAboveEquator / radius)) * (180 / Math.PI);
    return { latitude: latitudeDegrees, longitude: longitudeDegrees };
  }

  // Below the equator the hat is a cylinder, so map height directly onto
  // latitude to keep the map continuous down the sides.
  const normalisedVerticalDistance =
    equatorY === 0 ? 0 : heightAboveEquator / equatorY;
  const cylindricalLatitude =
    Math.asin(clampToUnit(normalisedVerticalDistance)) * (180 / Math.PI);
  return { latitude: cylindricalLatitude, longitude: longitudeDegrees };
};

function isNewZealand(coordinates: GlobalCoordinates) {
  return (
    coordinates.latitude > -50 &&
    coordinates.latitude < -34 &&
    coordinates.longitude > 165 &&
    coordinates.longitude < 180
  );
}

/**
 * The globe coordinate a single stitch position samples, after orientation.
 * Exported for testing.
 */
const globeCoordinatesForStitch = (
  position: Point,
  maxY: number,
  orientationParameters: OrientationParameters
): GlobalCoordinates =>
  rotateToDestination(
    getGlobalCoordinates(position, maxY),
    orientationParameters
  );

/**
 * Colour every stitch position in one pass.
 *
 * The raster is decoded once up front and then sampled synchronously, so this
 * does not yield per stitch. Callers get one array back and can apply it in a
 * single update, instead of one state write per stitch.
 */
const colourNodes = async (
  positions: Point[],
  orientationParameters: OrientationParameters,
  palette: RGB[] = Object.values(Palette)
): Promise<RGB[]> => {
  const globe = await loadGlobe();

  const maxY = positions.reduce((max, { y }) => (y > max ? y : max), 0);

  return positions.map((position) => {
    const coordinates = globeCoordinatesForStitch(
      position,
      maxY,
      orientationParameters
    );

    if (!orientationParameters.displayNewZealand && isNewZealand(coordinates)) {
      return Palette.Blue;
    }

    return colourAt(globe, coordinates, palette) ?? unknownColour;
  });
};

/** Single-stitch colouring. Prefer colourNodes when colouring a whole hat. */
const colourNode = async (
  position: Point,
  maxY: number,
  orientationParameters: OrientationParameters,
  palette: RGB[] = Object.values(Palette)
): Promise<RGB> => {
  const globe = await loadGlobe();
  const coordinates = globeCoordinatesForStitch(
    position,
    maxY,
    orientationParameters
  );
  if (!orientationParameters.displayNewZealand && isNewZealand(coordinates)) {
    return Palette.Blue;
  }
  return colourAt(globe, coordinates, palette) ?? unknownColour;
};

export {
  colourNode,
  colourNodes,
  getGlobalCoordinates,
  globeCoordinatesForStitch,
  rotateToDestination,
  clampToUnit,
  isNewZealand,
};
