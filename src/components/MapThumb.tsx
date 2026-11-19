import React, { useEffect, useMemo, useRef } from "react";
import type { Stitch as HatStitch } from "../types/Stitch";
import type { HatReading } from "../knitting/useHatKnitting";
import { unrolled } from "../knitting/unrolled";
import { yarnFor } from "../reading/palette";
import type { RGB } from "../types/RGB";

/** The picture's size in pixels, drawn at twice what a card shows. */
const width = 680;
const height = 380;

/** How tall a brim's strip is, in the picture's pixels. */
const brimBand = 18;

/** A brim along the foot of the picture: its colour, ribbed two and two. */
const drawBrim = (context: CanvasRenderingContext2D, colour: RGB) => {
  context.fillStyle = `rgb(${colour.join(",")})`;
  context.fillRect(0, height - brimBand, width, brimBand);
  context.fillStyle = "rgba(0, 0, 0, 0.14)";
  for (let x = 4; x < width; x += 8) context.fillRect(x, height - brimBand, 4, brimBand);
};

/**
 * A hat's card picture: the map it is a picture of, unrolled into a
 * rectangle edge to edge - every round across the full width, the crown at
 * the top - in the knitter's own yarns. See knitting/unrolled. A brim is a
 * ribbed strip along the foot, in its own colour.
 */
const MapThumb: React.FC<{ hat: HatStitch[]; reading: HatReading }> = ({ hat, reading }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { knitting, palette } = reading;
  const rounds = useMemo(() => unrolled(hat, knitting), [hat, knitting]);
  const trim = useMemo(() => hat.find((stitch) => stitch.brim)?.colour, [hat]);
  useEffect(() => {
    const context = ref.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const brim = trim ? brimBand : 0;
    if (trim) drawBrim(context, trim);
    const tall = (height - brim) / Math.max(rounds.length, 1);
    rounds.forEach((row, at) => {
      const top = height - brim - (at + 1) * tall;
      for (const one of row) {
        context.fillStyle = yarnFor(palette, one.slot).hex;
        const x = one.from * width;
        // A hair wider and taller than its share, so no seam of the card shows between neighbours.
        const span = (one.to - one.from) * width + 0.75;
        for (const shift of [-width, 0, width]) {
          if (x + shift < width && x + shift + span > 0) context.fillRect(x + shift, top, span, tall + 0.75);
        }
      }
    });
  }, [rounds, palette, trim]);
  return <canvas ref={ref} className="map-thumb" width={width} height={height} aria-hidden="true" />;
};

export default MapThumb;
