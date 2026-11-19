import { describe, expect, it } from "vitest";
import { getStitches } from "../helpers/stitches";
import { hatKnitting } from "./hat-knitting";
import { unrolled } from "./unrolled";

describe("the hat unrolled", () => {
  const hat = getStitches(90, 20, "Pyramidal");
  const knitting = hatKnitting(hat);
  const rounds = unrolled(hat, knitting);

  it("has a row for every round, each with every stitch of it", () => {
    expect(rounds).toHaveLength(knitting.rounds.length);
    rounds.forEach((row, at) => expect(row).toHaveLength(knitting.rounds[at].length));
  });

  it("covers every round edge to edge, with no gap and no overlap", () => {
    for (const row of rounds) {
      const width = row.reduce((total, one) => total + (one.to - one.from), 0);
      expect(width).toBeCloseTo(1, 9);
      for (let k = 1; k < row.length; k++) expect(row[k].from).toBeCloseTo(row[k - 1].to, 9);
      expect(row[0].from + 1).toBeCloseTo(row[row.length - 1].to, 9);
    }
  });

  it("gives each stitch its own yarn", () => {
    const slots = new Set(knitting.stitches.filter(Boolean).map((stitch) => stitch.slot));
    for (const row of rounds) for (const one of row) expect(slots.has(one.slot)).toBe(true);
  });
});
