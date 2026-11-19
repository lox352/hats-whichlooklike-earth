import { describe, expect, it } from "vitest";
import { brimNeedlesFor, brimRoundsFor, brimStitchesFor, hatRoundOf, pictureOf } from "./brim";
import { getStitches } from "./stitches";
import { hatKnitting } from "../knitting/hat-knitting";
import { unrolled } from "../knitting/unrolled";
import { isStep } from "../pattern/Stitch";
import { validateDesign } from "../types/KnittingMachine";
import type { RGB } from "../types/RGB";

const red: RGB = [178, 34, 52];
const brim = { rounds: 13, needles: 3.5, colour: red };
const hat = getStitches(130, 12, "Pyramidal", { brim, needles: 4 });
const plain = getStitches(130, 12, "Pyramidal", { needles: 4 });
const knitting = hatKnitting(hat);

describe("a brim's numbers", () => {
  it.each([60, 96, 100, 130, 150, 200])("ribs %i stitches' worth over about a tenth fewer, in fours", (across) => {
    const cast = brimStitchesFor(across);
    expect(cast % 4).toBe(0);
    expect(cast).toBeLessThan(across);
    expect(cast / across).toBeGreaterThan(0.85);
    expect(cast / across).toBeLessThan(0.95);
  });

  it("is never more stitches than the hat, however few the hat has", () => {
    for (let across = 20; across < 40; across++) expect(brimStitchesFor(across)).toBeLessThan(across);
  });

  it("is knitted on needles two sizes smaller", () => {
    expect(brimNeedlesFor(4)).toBe(3.5);
    expect(brimNeedlesFor(5)).toBe(4);
    expect(brimNeedlesFor(3.25)).toBe(2.75);
    expect(brimNeedlesFor(2)).toBe(2);
  });

  it("counts its depth in rounds, and has none at 0", () => {
    expect(brimRoundsFor(5, 26)).toBe(13);
    expect(brimRoundsFor(0, 26)).toBe(0);
    expect(brimRoundsFor(0.2, 26)).toBe(3);
  });

  it("must have room for a cast-on, a rib and an increase, or be none", () => {
    expect(validateDesign(130, 12, "Pyramidal", 2).map((problem) => problem.field)).toEqual(["brimRounds"]);
    expect(validateDesign(130, 12, "Pyramidal", 0)).toEqual([]);
    expect(validateDesign(130, 12, "Pyramidal", 3)).toEqual([]);
  });
});

describe("a hat knitted with a brim", () => {
  it("casts on the brim's stitches in its colour and on its needles", () => {
    const cast = hat.filter((stitch) => stitch.fixed && stitch.type !== "join");
    expect(cast).toHaveLength(116);
    expect(cast.every((stitch) => stitch.brim && stitch.colour.join() === red.join())).toBe(true);
    expect(hat[0].needles).toBe(3.5);
  });

  it("is, above the brim, the hat that has none: stitch for stitch, crown and all", () => {
    const above = hat.filter((stitch) => !stitch.brim);
    const start = plain.findIndex((stitch) => !stitch.fixed);
    // A hat with no brim casts on its first round; this one knits it, so the rest are the same.
    const rest = plain.slice(start);
    expect(above.slice(-rest.length).map((stitch) => stitch.type)).toEqual(rest.map((stitch) => stitch.type));
    const shift = above[above.length - rest.length].id - rest[0].id;
    expect(above.slice(-rest.length).map((stitch) => stitch.links.map((link) => link - shift))).toEqual(rest.map((stitch) => stitch.links));
    expect(hatRoundOf(hat)).toBe(130);
    expect(hatRoundOf(plain)).toBeUndefined();
  });

  it("changes to the hat's needles where the picture begins", () => {
    expect(hat.find((stitch) => !stitch.brim)?.needles).toBe(4);
  });

  it("leaves a hat with no brim as it always was", () => {
    const bare = getStitches(130, 12, "Pyramidal");
    // The needles are only noted on the first stitch; nothing else changes.
    expect(plain.slice(1)).toEqual(bare.slice(1));
    expect({ ...plain[0], needles: undefined }).toEqual({ ...bare[0], needles: undefined });
    expect(bare.some((stitch) => stitch.brim || stitch.type === "p1" || stitch.type === "m1")).toBe(false);
  });
});

describe("a brim as the knitting reads it", () => {
  it("ribs, increases, and changes needles as a step", () => {
    expect(knitting.roundLabels.slice(0, 14)).toEqual([
      "cast on",
      ...Array(11).fill("k2, p2 rib"),
      "increase round, 14 increases",
      "",
    ]);
    expect(knitting.rounds[11]).toHaveLength(116);
    expect(knitting.rounds[12]).toHaveLength(130);
    expect(knitting.needleChanges).toEqual([13]);
    const step = knitting.stitches.filter((stitch) => stitch.type === "needles");
    expect(step).toHaveLength(1);
    expect(isStep(step[0])).toBe(true);
    expect(step[0].needles).toBe(4);
    // Straight after the brim's last stitch, before the first of the hat's.
    const last = knitting.idOfHat(hat.filter((stitch) => stitch.brim).length - 1);
    expect(step[0].id).toBe(last + 1);
    expect(knitting.hatIdOf(step[0].id)).toBeUndefined();
  });

  it("keeps every id in step with the hat's, past the join and the change of needles", () => {
    expect(knitting.stitches).toHaveLength(hat.length + 2);
    knitting.stitches.forEach((stitch, id) => expect(stitch.id).toBe(id));
    for (const stitch of hat) expect(knitting.hatIdOf(knitting.idOfHat(stitch.id))).toBe(stitch.id);
  });

  it("knits the rib k2, p2 and makes the make-ones from the bar", () => {
    const rib = knitting.rounds[1].map((id) => knitting.stitches[id].type);
    expect(rib.slice(0, 8)).toEqual(["k1", "k1", "p1", "p1", "k1", "k1", "p1", "p1"]);
    const made = knitting.rounds[12].filter((id) => knitting.stitches[id].type === "m1");
    expect(made).toHaveLength(14);
    // None at the start or end of the round, where the marker is.
    const types = knitting.rounds[12].map((id) => knitting.stitches[id].type);
    expect(types[0]).toBe("k1");
    expect(types[types.length - 1]).toBe("k1");
  });

  it("has a yarn of its own, T, and its own needles on every stitch", () => {
    const brimIds = hat.filter((stitch) => stitch.brim).map((stitch) => knitting.idOfHat(stitch.id));
    expect(brimIds.every((id) => knitting.stitches[id].slot === "T" && knitting.stitches[id].needles === 3.5)).toBe(true);
    const top = knitting.stitches[knitting.stitches.length - 1];
    expect(top.slot).not.toBe("T");
    expect(top.needles).toBe(4);
  });
});

describe("a brim is no part of the picture", () => {
  it("projects only the hat above it, with the first round above it at the foot", () => {
    const positions = hat.map((stitch) => stitch.position);
    const picture = pictureOf(hat, positions);
    expect(picture.ids).toHaveLength(hat.filter((stitch) => !stitch.brim).length);
    expect(picture.ids.every((id) => !hat[id].brim)).toBe(true);
    const first = picture.positions.slice(0, 130).reduce((sum, position) => sum + position.y, 0) / 130;
    expect(first).toBeCloseTo(0, 6);
  });

  it("projects a hat with no brim as it always did", () => {
    const positions = plain.map((stitch) => stitch.position);
    expect(pictureOf(plain, positions).positions).toEqual(positions);
  });

  it("leaves it off the card's map", () => {
    const rounds = unrolled(hat, knitting);
    expect(rounds).toHaveLength(knitting.rounds.length - 13);
    expect(rounds.flat().every((one) => one.slot !== "T")).toBe(true);
  });
});
