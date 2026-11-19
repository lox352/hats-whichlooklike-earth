import type { RGB } from "../types/RGB";
import type { Palette } from "../reading/palette";
import { earthColours, yarnKey, type YarnChoices } from "../helpers/yarn-preference";

/** The brim's yarn: one slot, whatever colour it was knitted in. See hat-knitting. */
export const trimSlot = "T";

/**
 * The hat's yarns as the knitting machinery names them: a letter each, as a
 * pattern's key does - A for the ocean, B the land, C the glaciers, D the
 * deserts - in the order the site has always listed them.
 *
 * A colour that is none of them, which no hat should have but a pattern saved
 * by some older build might, is its own slot, named by its colour, so it is
 * still shown as it was knitted.
 */

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const known = earthColours.map(({ key }) => key);

const hex = (colour: RGB): string =>
  `#${colour.map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0")).join("")}`;

export const slotOf = (colour: RGB): string => {
  const at = known.indexOf(yarnKey(colour));
  return at >= 0 ? letters[at] : hex(colour);
};

/**
 * What each slot looks like and is called: the knitter's own yarns, the
 * brim's in the colour it was knitted in, and any stray colour as itself.
 */
export const paletteFrom = (yarns: YarnChoices, slots: Iterable<string> = [], trim?: RGB): Palette => {
  const palette: Palette = {};
  earthColours.forEach(({ key, label, colour }, at) => {
    const yarn = yarns[key] ?? { name: label, colour };
    palette[letters[at]] = { name: yarn.name, hex: hex(yarn.colour), approximate: false };
  });
  if (trim) palette[trimSlot] = { name: "Brim", hex: hex(trim), approximate: false };
  for (const slot of slots) {
    if (!palette[slot] && slot.startsWith("#")) palette[slot] = { name: `Yarn ${slot}`, hex: slot, approximate: false };
  }
  return palette;
};
