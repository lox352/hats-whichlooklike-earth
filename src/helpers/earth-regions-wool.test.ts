import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as geotiff from "geotiff";
import { decodeRegionLabels } from "./earth-regions";
import { colourAt, GlobeRaster, Palette } from "./raster-colouring";
import { regionDescriptions } from "../data/region-names";
import labels from "../assets/region-labels.rle?raw";

/*
 * The promise this file exists to keep: a land region falls only on stitches
 * knitted in a land colour, and a water region only on stitches knitted in
 * the ocean blue. Not mostly - exactly, at every cell of the grid.
 *
 * So this decodes the real globe raster, asks colourAt for the colour of
 * every one of its 583,200 cells exactly as the dye pass would, and checks
 * the region there is the kind of place that colour looks like. If anyone
 * changes the globe image, the region data, or the arithmetic either lookup
 * uses to find its cell, this is the test that notices.
 */
describe("regions against the wool", () => {
  it("gives every cell a region of the kind the cell is knitted in", async () => {
    const bytes = readFileSync("src/assets/raster_globe.tif");
    const tiff = await geotiff.fromArrayBuffer(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    );
    const image = await tiff.getImage();
    const globe: GlobeRaster = {
      width: image.getWidth(),
      height: image.getHeight(),
      samplesPerPixel: image.getSamplesPerPixel(),
      rasterData: (await image.readRasters({ interleave: true })) as Uint8Array,
    };

    const regions = decodeRegionLabels(labels);
    expect([regions.width, regions.height]).toEqual([globe.width, globe.height]);

    const isBlue = (colour: number[]) =>
      colour[0] === Palette.Blue[0] &&
      colour[1] === Palette.Blue[1] &&
      colour[2] === Palette.Blue[2];

    const wrong: string[] = [];
    for (let row = 0; row < regions.height; row++) {
      // The coordinate at the centre of this cell's claim, which is what both
      // lookups round back to this same cell.
      const latitude = 90 - (row * 180) / regions.height;
      for (let column = 0; column < regions.width; column++) {
        const longitude = -180 + (column * 360) / regions.width;
        const colour = colourAt(globe, { latitude, longitude });
        const key = regions.keys[regions.cells[row * regions.width + column]];
        const water = regionDescriptions[key].kind !== "country";
        if (colour !== null && water !== isBlue(colour)) {
          wrong.push(`${longitude}°, ${latitude}°: ${key} on ${colour.join(",")}`);
          if (wrong.length > 5) break;
        }
      }
    }

    expect(wrong).toEqual([]);
  }, 60000);
});
