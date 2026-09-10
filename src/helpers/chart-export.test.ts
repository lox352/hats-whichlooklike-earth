import { describe, expect, it } from "vitest";
import { chartToSvg } from "./chart-export";
import { getStitches } from "./stitches";
import { Stitch } from "../types/Stitch";

const hat = () => getStitches(40, 8, "Pyramidal");

describe("chartToSvg", () => {
  it("produces a well-formed SVG sized to the chart", () => {
    const { svg, width, height, columns, rows } = chartToSvg(hat());
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(columns).toBeGreaterThan(0);
    expect(rows).toBeGreaterThan(0);
    // Parses as XML, so it will actually render.
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
  });

  it("draws one cell per charted stitch", () => {
    const stitches = hat();
    const { svg } = chartToSvg(stitches);
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    // One background rect plus one per stitch (stitch 0 is not charted).
    const rects = parsed.querySelectorAll("rect").length;
    expect(rects).toBe(stitches.length - 1 + 1);
  });

  it("marks the decreases", () => {
    const stitches = hat();
    const { svg } = chartToSvg(stitches);
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    const decreases = stitches.filter(
      (s) => s.type === "k2tog" || s.type === "k3tog"
    ).length;
    expect(decreases).toBeGreaterThan(0);
    expect(parsed.querySelectorAll("path").length).toBe(decreases);
  });

  it("omits labels when asked", () => {
    const withLabels = chartToSvg(hat(), { labels: true });
    const without = chartToSvg(hat(), { labels: false });
    expect(without.svg).not.toContain("<text");
    expect(withLabels.svg).toContain("<text");
    expect(without.width).toBeLessThan(withLabels.width);
  });

  it("scales with the cell size", () => {
    const small = chartToSvg(hat(), { cell: 6, labels: false });
    const large = chartToSvg(hat(), { cell: 12, labels: false });
    expect(large.width).toBeCloseTo(small.width * 2, 5);
    expect(large.height).toBeCloseTo(small.height * 2, 5);
  });

  it("handles an empty pattern without throwing", () => {
    expect(() => chartToSvg([])).not.toThrow();
  });

  // Stitches can come from localStorage, which the user can edit by hand.
  it("cannot be made to inject markup through a colour", () => {
    const nasty: Stitch[] = [
      {
        id: 1,
        position: { x: 0, y: 0, z: 0 },
        links: [],
        fixed: true,
        type: "k1",
        colour: ['"/><script>bad()</script>', 999, -4] as unknown as Stitch["colour"],
      },
    ];
    const { svg } = chartToSvg(nasty);
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("bad()");
    // The bad channel becomes 0, and the others clamp into range.
    expect(svg).toContain("rgb(0,255,0)");
  });
});
