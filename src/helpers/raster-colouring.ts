import rasterGlobe from "../assets/raster_globe.tif";
import * as geotiff from "geotiff";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { RGB } from "../types/RGB";

/**
 * The five yarn colours. These are matched against the globe raster by nearest
 * neighbour in RGB space, so they double as the palette the finished hat is
 * knitted from.
 */
const Palette: { [key: string]: RGB } = {
  Blue: [119, 159, 196],
  Green: [178, 200, 169],
  White: [233, 240, 248],
  Beige: [241, 231, 212],
};

export interface GlobeRaster {
  width: number;
  height: number;
  /** Interleaved samples, `samplesPerPixel` values per pixel. */
  rasterData: Uint8Array;
  samplesPerPixel: number;
}

let globePromise: Promise<GlobeRaster> | null = null;

/**
 * Decode the globe raster once and share it. Callers that colour many stitches
 * should await this a single time and then use the synchronous `colourAt`,
 * rather than awaiting per stitch.
 */
const loadGlobe = (fileName: string = rasterGlobe): Promise<GlobeRaster> => {
  if (!globePromise) {
    globePromise = (async () => {
      const response = await fetch(fileName);
      const arrayBuffer = await response.arrayBuffer();
      const tiff = await geotiff.fromArrayBuffer(arrayBuffer);

      const image = await tiff.getImage();
      const rasterData = (await image.readRasters({
        interleave: true,
      })) as Uint8Array;

      return {
        width: image.getWidth(),
        height: image.getHeight(),
        // Read rather than assumed: an RGB raster would skew every sample if
        // the stride were hardcoded to 4.
        samplesPerPixel: image.getSamplesPerPixel(),
        rasterData,
      };
    })().catch((error) => {
      // Don't cache a failure, so a transient fetch error can be retried.
      globePromise = null;
      throw error;
    });
  }
  return globePromise;
};

const nearestPaletteColour = (colour: RGB, palette: RGB[]): RGB | null => {
  let closest: RGB | null = null;
  let smallestDistance = Infinity;

  for (const candidate of palette) {
    const distance =
      (colour[0] - candidate[0]) ** 2 +
      (colour[1] - candidate[1]) ** 2 +
      (colour[2] - candidate[2]) ** 2;

    if (distance < smallestDistance) {
      smallestDistance = distance;
      closest = candidate;
    }
  }

  return closest;
};

/**
 * Average the pixels within `sampleRadius` of the given coordinate and return
 * the nearest palette colour, or null if the coordinate is not usable.
 */
const colourAt = (
  globe: GlobeRaster,
  { latitude, longitude }: GlobalCoordinates,
  palette: RGB[] = Object.values(Palette),
  sampleRadius: number = 1
): RGB | null => {
  // Non-finite values must be rejected explicitly: every comparison against
  // NaN is false, so a range check alone would let NaN through and it would
  // then poison the pixel index and the nearest-colour search.
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  const { width, height, rasterData, samplesPerPixel } = globe;

  const x = Math.round(((longitude + 180) / 360) * width);
  const y = Math.round(((90 - latitude) / 180) * height);

  let count = 0;
  let r = 0;
  let g = 0;
  let b = 0;

  for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
    for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || px >= width || py < 0 || py >= height) continue;

      const index = (py * width + px) * samplesPerPixel;
      r += rasterData[index];
      g += rasterData[index + 1];
      b += rasterData[index + 2];
      count++;
    }
  }

  if (count === 0) return null;

  return nearestPaletteColour(
    [Math.round(r / count), Math.round(g / count), Math.round(b / count)],
    palette
  );
};

/** Convenience wrapper for one-off lookups. */
const getClosestColor = async (
  globalCoordinates: GlobalCoordinates,
  palette: RGB[],
  sampleRadius: number = 1
): Promise<RGB | null> =>
  colourAt(await loadGlobe(), globalCoordinates, palette, sampleRadius);

export { getClosestColor, colourAt, loadGlobe, Palette, type RGB };
