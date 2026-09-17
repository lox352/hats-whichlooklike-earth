import React, { useMemo } from "react";
import { Stitch } from "../types/Stitch";
import { chartToSvg } from "../helpers/chart-export";
import { useYarns } from "../useYarns";
import { cssColour, displayYarn } from "../helpers/yarn-preference";
import { regionCounts } from "../helpers/region-guide";

/** As many places as fit beside the chart without pushing it off the page. */
const printedPlaces = 24;

interface ChartPrintSheetProps {
  stitches: Stitch[];
  title: string;
}

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
  const { yarns } = useYarns();
  const chart = useMemo(
    () => chartToSvg(stitches, { cell: 12, yarns }),
    [stitches, yarns]
  );

  const used = useMemo(() => {
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

  /*
   * By size here, not by name as the screen index is: on paper this sits
   * beside the yarn key, which is also by size, and the eye reads the two
   * together. Capped, because an ocean-going hat can touch sixty places and
   * would push the chart off the sheet.
   */
  const places = useMemo(
    () => [...regionCounts(stitches)].sort((a, b) => b.stitches - a.stitches),
    [stitches]
  );
  const shown = places.slice(0, printedPlaces);

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
        {used.map((entry) => {
          const yarn = displayYarn(entry.colour, yarns);
          return (
            <span className="print-legend-item" key={entry.colour.join(",")}>
              <span
                className="print-legend-swatch"
                style={{ backgroundColor: cssColour(yarn.colour) }}
              />
              {yarn.name} &middot; {entry.count} stitches
            </span>
          );
        })}
      </div>
      {shown.length > 0 && (
        <div className="print-region-legend">
          <span className="print-region-title">Where this hat is</span>
          {shown.map((place) => (
            <span className="print-region-item" key={place.key}>
              {place.name} &middot; {place.stitches}
            </span>
          ))}
          {places.length > shown.length && (
            <span className="print-region-item">
              and {places.length - shown.length} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ChartPrintSheet;
