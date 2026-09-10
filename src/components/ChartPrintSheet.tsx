import React, { useMemo } from "react";
import { Stitch } from "../types/Stitch";
import { chartToSvg } from "../helpers/chart-export";

interface ChartPrintSheetProps {
  stitches: Stitch[];
  title: string;
}

const colourName = (colour: Stitch["colour"]): string => {
  const key = colour.join(",");
  switch (key) {
    case "119,159,196":
      return "Ocean";
    case "178,200,169":
      return "Land";
    case "233,240,248":
      return "Glacier";
    case "241,231,212":
      return "Ice shelf";
    default:
      return `rgb(${key})`;
  }
};

/**
 * The paper version of the chart.
 *
 * Hidden on screen and revealed by the print stylesheet, so Ctrl+P gives a
 * chart scaled to the page with a yarn key and a stitch count, instead of the
 * sideways-scrolling screen grid clipped at the paper's edge.
 */
const ChartPrintSheet: React.FC<ChartPrintSheetProps> = ({
  stitches,
  title,
}) => {
  const chart = useMemo(() => chartToSvg(stitches, { cell: 12 }), [stitches]);

  const yarns = useMemo(() => {
    const counts = new Map<string, { colour: Stitch["colour"]; count: number }>();
    stitches.forEach((stitch) => {
      if (stitch.id === 0) return;
      const key = stitch.colour.join(",");
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { colour: stitch.colour, count: 1 });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }, [stitches]);

  return (
    <div className="print-only print-sheet">
      <h1>{title}</h1>
      <p className="print-meta">
        {chart.columns} stitches across &middot; {chart.rows} rows &middot; read
        from the bottom right, working right to left
      </p>
      <div
        // The markup is generated from numeric layout data by chartToSvg, which
        // escapes its only text and coerces colours to integers.
        dangerouslySetInnerHTML={{ __html: chart.svg }}
      />
      <div className="print-legend">
        {yarns.map((yarn) => (
          <span className="print-legend-item" key={yarn.colour.join(",")}>
            <span
              className="print-legend-swatch"
              style={{ backgroundColor: `rgb(${yarn.colour.join(",")})` }}
            />
            {colourName(yarn.colour)} &middot; {yarn.count} stitches
          </span>
        ))}
      </div>
    </div>
  );
};

export default ChartPrintSheet;
