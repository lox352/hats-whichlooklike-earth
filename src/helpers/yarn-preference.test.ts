import { beforeEach, describe, expect, it } from "vitest";
import {
  clearYarns,
  cssColour,
  defaultYarns,
  displayYarn,
  earthColours,
  readYarns,
  writeYarns,
  yarnKey,
} from "./yarn-preference";
import { Palette } from "./raster-colouring";
import { RGB } from "../types/RGB";

beforeEach(() => {
  localStorage.clear();
});

describe("defaults", () => {
  it("covers every colour in the matching palette", () => {
    const paletteKeys = Object.values(Palette).map((c) => yarnKey(c as RGB));
    const defaults = defaultYarns();
    paletteKeys.forEach((key) => expect(defaults[key]).toBeDefined());
    expect(Object.keys(defaults).length).toBe(paletteKeys.length);
  });

  it("names them after what they are on the earth", () => {
    const defaults = defaultYarns();
    expect(defaults[yarnKey(Palette.Blue)].name).toBe("Ocean");
    expect(defaults[yarnKey(Palette.Green)].name).toBe("Land");
  });

  it("starts as the earth's own colours", () => {
    const defaults = defaultYarns();
    earthColours.forEach(({ key, colour }) =>
      expect(defaults[key].colour).toEqual(colour)
    );
  });
});

describe("round trip", () => {
  it("remembers a choice", () => {
    const key = yarnKey(Palette.Blue);
    const yarns = defaultYarns();
    yarns[key] = { name: "Drops Nord, navy", colour: [30, 40, 90] };
    writeYarns(yarns);
    expect(readYarns()[key]).toEqual({
      name: "Drops Nord, navy",
      colour: [30, 40, 90],
    });
  });

  it("falls back to defaults with nothing stored", () => {
    expect(readYarns()).toEqual(defaultYarns());
  });

  it("resets", () => {
    const yarns = defaultYarns();
    yarns[yarnKey(Palette.Blue)] = { name: "x", colour: [1, 2, 3] };
    writeYarns(yarns);
    clearYarns();
    expect(readYarns()).toEqual(defaultYarns());
  });
});

/** Preferences are user-editable storage, so nothing from them is trusted. */
describe("reading is defensive", () => {
  it("survives corrupt JSON", () => {
    localStorage.setItem("yarn-choices", "{ not json");
    expect(readYarns()).toEqual(defaultYarns());
  });

  it("survives the wrong shape", () => {
    localStorage.setItem("yarn-choices", JSON.stringify({ nonsense: 1 }));
    expect(readYarns()).toEqual(defaultYarns());
  });

  it("clamps colour channels and rejects non-numbers", () => {
    const key = yarnKey(Palette.Blue);
    localStorage.setItem(
      "yarn-choices",
      JSON.stringify({ [key]: { name: "x", colour: [999, -5, "nope"] } })
    );
    expect(readYarns()[key].colour).toEqual([255, 0, 0]);
  });

  it("falls back for a blank or non-string name", () => {
    const key = yarnKey(Palette.Green);
    localStorage.setItem(
      "yarn-choices",
      JSON.stringify({ [key]: { name: "   ", colour: [1, 2, 3] } })
    );
    expect(readYarns()[key].name).toBe("Land");
  });

  it("caps a very long name", () => {
    const key = yarnKey(Palette.Green);
    localStorage.setItem(
      "yarn-choices",
      JSON.stringify({ [key]: { name: "y".repeat(500), colour: [1, 2, 3] } })
    );
    expect(readYarns()[key].name.length).toBeLessThanOrEqual(40);
  });
});

describe("displayYarn", () => {
  it("maps a pattern colour to the chosen yarn", () => {
    const yarns = defaultYarns();
    const key = yarnKey(Palette.Blue);
    yarns[key] = { name: "My navy", colour: [10, 20, 30] };
    expect(displayYarn(Palette.Blue, yarns)).toEqual({
      name: "My navy",
      colour: [10, 20, 30],
    });
  });

  it("passes through a colour it has never heard of", () => {
    const odd: RGB = [7, 7, 7];
    expect(displayYarn(odd, defaultYarns()).colour).toEqual(odd);
  });
});

describe("cssColour", () => {
  it("clamps rather than emitting nonsense", () => {
    expect(cssColour([300, -20, 12] as RGB)).toBe("rgb(255,0,12)");
  });
});
