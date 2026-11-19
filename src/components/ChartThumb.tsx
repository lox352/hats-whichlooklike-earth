import React, { useEffect, useRef } from "react";
import type { HatReading } from "../knitting/useHatKnitting";
import { isFabric } from "../pattern/Stitch";
import { yarnFor } from "../reading/palette";

/** Pixels a stitch, on the card. */
const scale = 2;

/**
 * The whole chart, small: a hat's picture as it is knitted, every stitch a
 * dot of its yarn standing over the stitches it was worked into, and what is
 * knitted so far shaded - so a card says what the hat is and how far it has
 * got without a word. Painted once on a canvas, as the chart is.
 */
const ChartThumb: React.FC<{ reading: HatReading; progress: number; paper: string }> = ({ reading, progress, paper }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { stitches, layout, palette } = reading;
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(layout.columns * scale * ratio);
    canvas.height = Math.ceil(layout.rows * scale * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, layout.columns * scale, layout.rows * scale);
    for (const stitch of stitches) {
      if (!stitch || !isFabric(stitch)) continue;
      const cell = layout.cells.get(stitch.id);
      if (!cell) continue;
      // Read from the bottom right, as the chart is: column 1 at the right, round 1 at the foot.
      const x = (layout.columns - cell.column) * scale;
      const y = (layout.rows - cell.row) * scale;
      context.fillStyle = yarnFor(palette, stitch.slot).hex;
      context.fillRect(x, y, scale, scale);
      if (stitch.id <= progress) {
        context.fillStyle = paper;
        context.globalAlpha = 0.55;
        context.fillRect(x, y, scale, scale);
        context.globalAlpha = 1;
      }
    }
  }, [stitches, layout, palette, progress, paper]);
  return (
    <canvas
      ref={ref}
      className="chart-thumb"
      style={{ aspectRatio: `${layout.columns} / ${Math.max(layout.rows, 1)}` }}
      aria-hidden="true"
    />
  );
};

export default ChartThumb;
