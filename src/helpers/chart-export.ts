import { Stitch } from "../types/Stitch";
import { layOutStitches } from "./pattern-layout";
import { displayYarn, YarnChoices } from "./yarn-preference";

/**
 * Builds the chart as an SVG from the layout data, rather than trying to
 * rasterise the on-screen grid. It comes out crisp at any size, carries the
 * decrease symbols, and is what both the SVG and PNG downloads are made from.
 */

export interface ChartSvgOptions {
  /** Side of one stitch cell, in SVG units. */
  cell?: number;
  /** Draw row and stitch numbers around the edges. */
  labels?: boolean;
  background?: string;
  gridColour?: string;
  /** Every nth line is drawn heavier, to make counting easier. */
  emphasisEvery?: number;
  /** How to draw each of the earth's colours; defaults to the earth's own. */
  yarns?: YarnChoices;
}

const defaults = {
  cell: 12,
  labels: true,
  background: "#ffffff",
  gridColour: "#334155",
  emphasisEvery: 5,
} satisfies Omit<Required<ChartSvgOptions>, "yarns">;

/**
 * Stitch colours are rendered into SVG markup, and stitches can come from
 * localStorage, which the user can edit. Coerce to three plain integers rather
 * than trusting whatever is in the array.
 */
const safeColour = (colour: Stitch["colour"]): string => {
  const channel = (value: unknown) => {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return 0;
    return Math.min(Math.max(number, 0), 255);
  };
  return `rgb(${channel(colour?.[0])},${channel(colour?.[1])},${channel(
    colour?.[2]
  )})`;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Knitting symbols, drawn to match the on-screen chart. */
const decreaseSymbol = (
  type: Stitch["type"],
  x: number,
  y: number,
  cell: number,
  colour: string
): string => {
  const inset = cell * 0.2;
  if (type === "k2tog") {
    // A right-leaning stroke, the usual mark for "knit two together".
    return `<path d="M${x + inset} ${y + cell - inset}L${x + cell - inset} ${
      y + inset
    }" stroke="${colour}" stroke-width="${cell * 0.09}" fill="none" stroke-linecap="round"/>`;
  }
  if (type === "k3tog") {
    // A centred chevron: three stitches converging into one.
    const mid = x + cell / 2;
    return `<path d="M${x + inset} ${y + cell - inset}L${mid} ${y + inset}L${
      x + cell - inset
    } ${y + cell - inset}" stroke="${colour}" stroke-width="${
      cell * 0.09
    }" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  return "";
};

export interface ChartSvg {
  svg: string;
  width: number;
  height: number;
  /** Stitches wide and rows tall, for captions. */
  columns: number;
  rows: number;
}

export const chartToSvg = (
  stitches: Stitch[],
  options: ChartSvgOptions = {}
): ChartSvg => {
  const { cell, labels, background, gridColour, emphasisEvery } = {
    ...defaults,
    ...options,
  };
  const yarns = options.yarns;

  const charted = stitches.filter((stitch) => stitch.id !== 0);
  const { positions, numRows, numCols } = layOutStitches(charted);

  const gutter = labels ? cell * 2.6 : 0;
  const width = numCols * cell + gutter;
  const height = numRows * cell + gutter;

  const cells: string[] = [];
  const symbols: string[] = [];

  charted.forEach((stitch) => {
    const position = positions[stitch.id];
    if (!position) return;
    // Grid coordinates run right-to-left and bottom-to-top, matching the way
    // the rounds were knitted.
    const col = numCols + position.col - 1;
    const row = numRows + position.row - 1;
    if (col < 0 || row < 0) return;
    const x = col * cell;
    const y = row * cell;
    cells.push(
      `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${safeColour(
        yarns ? displayYarn(stitch.colour, yarns).colour : stitch.colour
      )}"/>`
    );
    const symbol = decreaseSymbol(stitch.type, x, y, cell, "#1f2937");
    if (symbol) symbols.push(symbol);
  });

  const lines: string[] = [];
  for (let c = 0; c <= numCols; c++) {
    /*
     * Heavy lines fall after every fifth stitch, counting from the right.
     * Cell index c holds stitch number numCols - c, so the boundary after
     * stitch 5 is the left edge of that stitch's cell.
     */
    const heavy = (numCols - c) % emphasisEvery === 0;
    lines.push(
      `<line x1="${c * cell}" y1="0" x2="${c * cell}" y2="${
        numRows * cell
      }" stroke="${gridColour}" stroke-width="${heavy ? 0.9 : 0.35}"/>`
    );
  }
  for (let r = 0; r <= numRows; r++) {
    const heavy = (numRows - r) % emphasisEvery === 0;
    lines.push(
      `<line x1="0" y1="${r * cell}" x2="${numCols * cell}" y2="${
        r * cell
      }" stroke="${gridColour}" stroke-width="${heavy ? 0.9 : 0.35}"/>`
    );
  }

  const labelMarks: string[] = [];
  if (labels) {
    const fontSize = cell * 0.72;
    // Stitch numbers along the bottom, counting right to left as knitted.
    for (let c = emphasisEvery; c <= numCols; c += emphasisEvery) {
      const x = (numCols - c) * cell + cell / 2;
      labelMarks.push(
        `<text x="${x}" y="${
          numRows * cell + fontSize + cell * 0.35
        }" font-size="${fontSize}" fill="${gridColour}" text-anchor="middle" font-family="ui-monospace, monospace">${c}</text>`
      );
    }
    // Row numbers up the right-hand side, counting from the cast-on.
    for (let r = emphasisEvery; r <= numRows; r += emphasisEvery) {
      const y = (numRows - r) * cell + cell * 0.85;
      labelMarks.push(
        `<text x="${numCols * cell + cell * 0.45}" y="${y}" font-size="${fontSize}" fill="${gridColour}" text-anchor="start" font-family="ui-monospace, monospace">${r}</text>`
      );
    }
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
    `<title>${escapeXml(
      `Knitting chart, ${numCols} stitches by ${numRows} rows`
    )}</title>`,
    `<rect width="${width}" height="${height}" fill="${background}"/>`,
    `<g>${cells.join("")}</g>`,
    `<g>${lines.join("")}</g>`,
    `<g>${symbols.join("")}</g>`,
    `<g>${labelMarks.join("")}</g>`,
    `</svg>`,
  ].join("");

  return { svg, width, height, columns: numCols, rows: numRows };
};

const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

export const downloadChartSvg = (
  stitches: Stitch[],
  filename: string,
  yarns?: YarnChoices
): void => {
  const { svg } = chartToSvg(stitches, { yarns });
  triggerDownload(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    `${filename}.svg`
  );
};

/**
 * Rasterises the SVG through an offscreen canvas. Drawn at a multiple of the
 * chart's natural size so the stitches stay sharp when printed.
 */
export const downloadChartPng = async (
  stitches: Stitch[],
  filename: string,
  yarns?: YarnChoices,
  scale = 3
): Promise<void> => {
  const { svg, width, height } = chartToSvg(stitches, { yarns });
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not rasterise the chart"));
    image.src = source;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not rasterise the chart");
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Could not rasterise the chart");
  triggerDownload(blob, `${filename}.png`);
};
