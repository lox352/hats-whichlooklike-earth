import { describe, expect, it } from "vitest";
import { getStitches } from "../helpers/stitches";
import { hatKnitting, progressFromHat, joinOf } from "./hat-knitting";
import { isFabric, isStep, worksInto } from "../pattern/Stitch";
import { layOutSweater } from "../reading/layout";
import { layOutStitches } from "../helpers/pattern-layout";
import { printLayout } from "./print-layout";
import { indexRounds, positionOf, currentRun, totals, endOfRound } from "../reading/progress";

const hat = getStitches(120, 40, "Hemispherical");
const knitting = hatKnitting(hat);
const n = joinOf(hat)!;

describe("a hat as the knitting reads it", () => {
  it("casts on the whole ring, then joins it as a step", () => {
    expect(knitting.rounds[0]).toHaveLength(120);
    expect(knitting.stitches.slice(1, n + 1).every((stitch) => stitch.type === "castOn")).toBe(true);
    expect(knitting.stitches[n + 1].type).toBe("join");
    expect(isStep(knitting.stitches[n + 1])).toBe(true);
    // The ring is closed: the first stitch cast on follows the last.
    expect(knitting.stitches[1].links).toEqual([n]);
  });

  it("keeps every stitch's id in step with the hat's, past the join", () => {
    expect(knitting.stitches).toHaveLength(hat.length + 1);
    knitting.stitches.forEach((stitch, id) => expect(stitch.id).toBe(id));
    for (const stitch of hat) {
      const id = knitting.idOfHat(stitch.id);
      expect(knitting.hatIdOf(id)).toBe(stitch.id);
    }
    expect(knitting.hatIdOf(n + 1)).toBeUndefined();
  });

  it("knits the first round into the cast-on, in order", () => {
    const first = knitting.rounds[1];
    expect(first).toHaveLength(120);
    expect(first.map((id) => worksInto(knitting.stitches[id])[0])).toEqual(knitting.rounds[0]);
  });

  it("calls the double decrease what it is", () => {
    const types = new Set(knitting.stitches.map((stitch) => stitch.type));
    expect(types.has("s2kp")).toBe(true);
    expect(types.has("k2tog")).toBe(true);
    expect([...types].every((type) => ["castOn", "join", "k1", "k2tog", "s2kp"].includes(type))).toBe(true);
  });

  it("counts its rounds, and stands every stitch, as the hat's chart always has", () => {
    // A chart printed before, and a row counted on it, still mean the same.
    for (const [across, rows, method] of [[90, 36, "Pyramidal"], [130, 25, "Hemispherical"], [120, 40, "Hemispherical"]] as const) {
      const one = getStitches(across, rows, method);
      const before = layOutStitches(one.filter((stitch) => stitch.id !== 0));
      const now = printLayout(one);
      expect(now.numRows).toBe(before.numRows);
      expect(now.numCols).toBe(before.numCols);
      for (const stitch of one) if (stitch.id !== 0) expect(now.positions[stitch.id]).toEqual(before.positions[stitch.id]);
    }
    // And the rounds follow one another, each a run of the order of work.
    const order = knitting.rounds.flat();
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("charts every stitch of it", () => {
    const layout = layOutSweater(knitting.stitches, knitting.rounds, knitting.roundKinds, knitting.roundPieces);
    const fabric = knitting.stitches.filter(isFabric).length;
    expect(layout.cells.size).toBe(fabric);
    expect(layout.rows).toBe(knitting.rounds.length);
    expect(layout.columns).toBe(120);
  });

  it("counts a project's place in it", () => {
    const index = indexRounds(knitting.rounds, knitting.roundLabels, knitting.roundPieces, [{ id: "hat", label: "Hat" }], knitting.roundKinds);
    const start = positionOf(knitting.stitches, 0, index);
    expect(start.round).toBe(1);
    expect(currentRun(knitting.stitches, 0, index)?.type).toBe("castOn");
    expect(endOfRound(0, index, knitting.stitches)).toBe(n);
    expect(positionOf(knitting.stitches, n, index).joinNext).toBe("castOn");
    expect(totals(index, n + 1).worked).toBe(120);
    expect(positionOf(knitting.stitches, knitting.stitches.length - 1, index).finished).toBe(true);
  });

  it("reads progress kept by the hat's ids", () => {
    expect(progressFromHat(0, n)).toBe(0);
    expect(progressFromHat(n - 1, n)).toBe(n - 1);
    // Knitted to the join, as the hat counted it: cast on and joined.
    expect(progressFromHat(n, n)).toBe(n + 1);
    expect(progressFromHat(hat.length - 1, n)).toBe(knitting.stitches.length - 1);
  });
});
