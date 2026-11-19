import { describe, expect, it } from "vitest";
import { instructionsToText, roundToText, writtenInstructions } from "./written-instructions";
import { getStitches } from "./stitches";
import { Stitch } from "../types/Stitch";
import { RGB } from "../types/RGB";
import { hatKnitting } from "../knitting/hat-knitting";
import { slotOf } from "../knitting/yarns";

const ocean: RGB = [119, 159, 196];
const land: RGB = [178, 200, 169];
const name = (slot: string) => (slot === slotOf(ocean) ? "ocean" : "land");

const hat = () => getStitches(20, 6, "Hemispherical");

describe("writtenInstructions", () => {
  it("writes one entry per round of the chart", () => {
    const stitches = hat();
    const rounds = writtenInstructions(stitches);
    expect(rounds).toHaveLength(hatKnitting(stitches).rounds.length);
    expect(rounds[0].round).toBe(1);
  });

  // The stitch counts in the prose have to agree with the chart, or the two
  // instruments contradict each other.
  it("counts the same stitches per round as the chart", () => {
    const stitches = hat();
    const { rounds } = hatKnitting(stitches);
    writtenInstructions(stitches).forEach((round) => {
      expect(round.stitches).toBe(rounds[round.round - 1].length);
      expect(round.segments.reduce((total, segment) => total + segment.count, 0)).toBe(round.stitches);
    });
  });

  it("accounts for every stitch exactly once", () => {
    const stitches = hat();
    const written = writtenInstructions(stitches).reduce((total, round) => total + round.stitches, 0);
    expect(written).toBe(stitches.filter((s) => s.id !== 0).length);
  });

  it("casts on, then joins in the round", () => {
    const stitches: Stitch[] = hat().map((stitch) => ({ ...stitch, colour: ocean }));
    const [first, second] = writtenInstructions(stitches);
    expect(first.segments).toEqual([{ text: "Cast on 20", slot: slotOf(ocean), count: 20 }]);
    expect(first.joinAfter).toBe(true);
    expect(second.segments[0].text).toBe("Knit 20");
    expect(roundToText(first, name)).toBe("Round 1 (20 sts): Cast on 20 in ocean. Join in the round.");
  });

  it("breaks a run at a colour change", () => {
    const stitches: Stitch[] = hat().map((stitch) => ({
      ...stitch,
      colour: stitch.id <= 10 ? ocean : land,
    }));
    const [first] = writtenInstructions(stitches);
    expect(first.segments.length).toBeGreaterThan(1);
    expect(first.segments[0].slot).toBe(slotOf(ocean));
  });

  it("names the crown's decreases as they are knitted", () => {
    const words = writtenInstructions(hat())
      .flatMap((round) => round.segments)
      .map((segment) => segment.text);
    expect(words.some((text) => /^K2tog/.test(text))).toBe(true);
    expect(words.some((text) => /^S2kp/.test(text))).toBe(true);
    expect(words.some((text) => /k3tog/i.test(text))).toBe(false);
  });

  it("handles an empty pattern", () => {
    expect(writtenInstructions([])).toEqual([]);
  });

  it("writes the whole pattern a round a line", () => {
    const stitches = hat();
    const text = instructionsToText(stitches, name);
    expect(text.split("\n")).toHaveLength(writtenInstructions(stitches).length);
    expect(text.startsWith("Round 1 (20 sts): Cast on")).toBe(true);
  });
});
