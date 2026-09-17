import regionLabels from "../assets/region-labels.rle";
import { regionDescriptions } from "../data/region-names";
import { GlobalCoordinates } from "../types/GlobalCoordinates";

/*
 * Which country or ocean a point of the globe is in.
 *
 * The globe is tiled. Every point is inside exactly one country or one named
 * body of water, so every stitch of a charted hat is in exactly one, coast or
 * open sea or empty desert alike - which is what lets the chart say where you
 * are without ever having to say "nowhere".
 *
 * The tiling is not looked up in polygons at runtime; it is burned ahead of
 * time onto the same 1080x540 grid the globe raster is sampled from, by
 * scripts/region-reference.py, and shipped run-length encoded. That matters
 * for more than speed: the label and the colour of a stitch are then two
 * readings of one atlas at one point, rather than two sources that can drift
 * apart. Countries are Natural Earth at 1:50m, the water at 1:110m, and the
 * ragged margin the marine polygons leave along Antarctica is settled by
 * nearness - see the script.
 *
 * More than sharing a grid, the two are made to agree about what kind of
 * place each cell is: a land region falls only on cells knitted in a land
 * colour, and a water region only on cells knitted in the ocean blue. Where
 * the map and the photograph disagreed - a coastline half a cell out, the
 * Antarctic ice shelves floating on sea but painted as ice, the Arctic pack
 * white over water - the photograph won and the cell was given the nearest
 * region of the kind it looks like. So a blue stitch is always named as
 * water and a green one always as land, and the test on this file checks
 * that at every one of the 583,200 cells.
 *
 * The cost is that a place too small to be painted is not on the hat to be
 * named: Hawaii and Singapore average into the sea around them at a third of
 * a degree, so a stitch there is knitted blue and called by the ocean it is
 * knitted as.
 */

export interface RegionRaster {
  width: number;
  height: number;
  /** Region index per cell, row-major from the north-west corner. */
  cells: Uint16Array;
  /** The region key each index stands for. */
  keys: string[];
}

const formatTag = "region-labels 1";

/**
 * Decode the run-length encoded raster.
 *
 * The format is plain text so that a change to it shows up in a diff as
 * something a person can read: a tag and version, then the dimensions and
 * region count, then the keys in index order, then runs of `index:count`
 * running row by row from the north-west corner. Runs are allowed to cross
 * the end of a row, since decoding is purely positional.
 */
export const decodeRegionLabels = (text: string): RegionRaster => {
  const lines = text.trim().split("\n");
  if (lines[0]?.trim() !== formatTag) {
    throw new Error("Not a region label raster");
  }

  const header = lines[1]?.trim().split(/\s+/).map(Number) ?? [];
  const [width, height, count] = header;
  if (header.length !== 3 || !header.every((value) => Number.isInteger(value) && value > 0)) {
    throw new Error("Region label raster has no usable dimensions");
  }

  const keys = lines[2]?.trim().split(/\s+/) ?? [];
  if (keys.length !== count) {
    throw new Error(`Region label raster promised ${count} regions and lists ${keys.length}`);
  }

  const cells = new Uint16Array(width * height);
  let at = 0;
  for (const line of lines.slice(3)) {
    for (const run of line.trim().split(/\s+/)) {
      if (!run) continue;
      const [value, length] = run.split(":").map(Number);
      if (!Number.isInteger(value) || !Number.isInteger(length) || length <= 0) {
        throw new Error(`Region label raster has a malformed run: ${run}`);
      }
      if (value < 0 || value >= count) {
        throw new Error(`Region label raster refers to region ${value}, which it does not list`);
      }
      if (at + length > cells.length) {
        throw new Error("Region label raster has more cells than its dimensions allow");
      }
      cells.fill(value, at, at + length);
      at += length;
    }
  }
  if (at !== cells.length) {
    throw new Error(`Region label raster covers ${at} cells of ${cells.length}`);
  }

  return { width, height, cells, keys };
};

let rasterPromise: Promise<RegionRaster> | null = null;

/**
 * Decode the raster once and share it, as the globe raster is shared. Callers
 * labelling many stitches should await this a single time and then use the
 * synchronous `regionAt`.
 */
export const loadRegionLabels = (
  fileName: string = regionLabels
): Promise<RegionRaster> => {
  if (!rasterPromise) {
    rasterPromise = (async () => {
      const response = await fetch(fileName);
      if (!response.ok) {
        throw new Error(`Could not fetch the region labels: ${response.status}`);
      }
      return decodeRegionLabels(await response.text());
    })().catch((error) => {
      // Don't cache a failure, so a transient fetch error can be retried.
      rasterPromise = null;
      throw error;
    });
  }
  return rasterPromise;
};

/**
 * The cell of the raster a coordinate reads from.
 *
 * Deliberately `Math.round`, not `Math.floor`: it is what `colourAt` in
 * raster-colouring.ts does, and the two must land on the same cell. A colour
 * is averaged over a 3x3 neighbourhood and would hardly notice the
 * difference; a label is one cell, so indexing the grid even half a cell
 * differently would put every coastal label consistently to one side of the
 * coast it belongs to.
 */
const cellOf = (
  { width, height }: RegionRaster,
  { latitude, longitude }: GlobalCoordinates
): number => {
  // Clamped exactly as colourAt clamps, so that a coordinate reads its colour
  // and its region from one cell. Longitude 180 and latitude -90 are both
  // reachable exactly and both round one past the edge.
  const column = Math.min(Math.round(((longitude + 180) / 360) * width), width - 1);
  const row = Math.min(Math.round(((90 - latitude) / 180) * height), height - 1);
  return row * width + column;
};

/**
 * The region a point of the globe is in, by key.
 *
 * Throws rather than returning nothing: the globe is tiled, so a coordinate
 * that is on it always has an answer. An unlabelled stitch has to keep
 * meaning "this hat was charted before labels existed", never "the lookup
 * quietly gave up".
 */
export const regionAt = (
  raster: RegionRaster,
  coordinates: GlobalCoordinates
): string => {
  const { latitude, longitude } = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Invalid globe coordinates");
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error("Invalid globe coordinates");
  }
  return raster.keys[raster.cells[cellOf(raster, coordinates)]];
};

/** True for an ocean, a sea, a bay or a gulf; false for a country. */
const isWater = (key: string): boolean =>
  regionDescriptions[key] !== undefined &&
  regionDescriptions[key].kind !== "country";

/**
 * The nearest region that is water, searched outwards in rings.
 *
 * For the hat that hides New Zealand: the picture paints sea there, so the
 * label has to say sea too, and the truthful answer is whatever water the
 * islands are sitting in. Bounded, because an unbounded search over a grid
 * that is mostly ocean would only ever run away on corrupt input.
 */
export const marineRegionNear = (
  raster: RegionRaster,
  coordinates: GlobalCoordinates
): string => {
  const here = regionAt(raster, coordinates);
  if (isWater(here)) return here;

  const { width, height, cells, keys } = raster;
  const centre = cellOf(raster, coordinates);
  const column = centre % width;
  const row = Math.floor(centre / width);

  const limit = Math.round(width / 18); // 20 degrees, far beyond any island
  for (let ring = 1; ring <= limit; ring++) {
    for (let down = -ring; down <= ring; down++) {
      const y = row + down;
      if (y < 0 || y >= height) continue;
      // Only the edge of the ring: the inside was searched a turn ago.
      const step = Math.abs(down) === ring ? 1 : 2 * ring;
      for (let right = -ring; right <= ring; right += step) {
        const x = ((column + right) % width + width) % width;
        const key = keys[cells[y * width + x]];
        if (isWater(key)) return key;
      }
    }
  }
  throw new Error("No water within reach of these coordinates");
};
