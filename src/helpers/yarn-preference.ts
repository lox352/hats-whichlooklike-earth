import { RGB } from "../types/RGB";
import { Palette } from "./raster-colouring";

/**
 * Which real yarn stands in for each of the earth's colours.
 *
 * The matching palette is deliberately not editable. Colours are chosen by
 * nearest neighbour against the globe raster, so changing the values would
 * change which stitches come out as land or sea and distort the map. The
 * earth's colours are fixed; what is yours is the yarn you knit them in.
 *
 * So this is a display mapping applied on the way out, to the chart, the
 * printed key and the knitting panel. The pattern data is untouched.
 */

export interface Yarn {
  /** What to call it, on the chart key and while knitting. */
  name: string;
  /** What to draw it as. */
  colour: RGB;
}

/** Key for a palette entry: its fixed colour, as written in the pattern. */
export const yarnKey = (colour: RGB): string =>
  `${colour[0]},${colour[1]},${colour[2]}`;

export const earthColours: { key: string; label: string; colour: RGB }[] = [
  { key: yarnKey(Palette.Blue), label: "Ocean", colour: Palette.Blue },
  { key: yarnKey(Palette.Green), label: "Land", colour: Palette.Green },
  { key: yarnKey(Palette.White), label: "Glacier", colour: Palette.White },
  // Sand: the Sahara, the Arabian and Australian deserts. It was called "Ice shelf" at first, which it never was.
  { key: yarnKey(Palette.Beige), label: "Desert", colour: Palette.Beige },
];

export type YarnChoices = Record<string, Yarn>;

export const defaultYarns = (): YarnChoices =>
  Object.fromEntries(
    earthColours.map(({ key, label, colour }) => [
      key,
      { name: label, colour },
    ])
  );

const storageKey = "yarn-choices";

const channel = (value: unknown): number => {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return 0;
  return Math.min(Math.max(number, 0), 255);
};

const sanitiseYarn = (raw: unknown, fallback: Yarn): Yarn => {
  if (typeof raw !== "object" || raw === null) return fallback;
  const candidate = raw as Partial<Yarn>;
  const name =
    typeof candidate.name === "string" && candidate.name.trim().length > 0
      ? candidate.name.trim().slice(0, 40)
      : fallback.name;
  const colour = Array.isArray(candidate.colour)
    ? ([
        channel(candidate.colour[0]),
        channel(candidate.colour[1]),
        channel(candidate.colour[2]),
      ] as RGB)
    : fallback.colour;
  return { name, colour };
};

/*
 * Yarns are saved with every name, the defaults included, as soon as any one
 * is changed. A name still the old default for the sand, "Ice shelf", is the
 * site's own mistake and not the knitter's choice, so it reads as the yarn's
 * name now; one the knitter typed is kept.
 */
const oldNames: Record<string, string> = { [yarnKey(Palette.Beige)]: "Ice shelf" };
const renamed = (key: string, yarn: Yarn): Yarn =>
  oldNames[key] === yarn.name
    ? { ...yarn, name: earthColours.find((one) => one.key === key)?.label ?? yarn.name }
    : yarn;

export const readYarns = (): YarnChoices => {
  const defaults = defaultYarns();
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    return Object.fromEntries(
      earthColours.map(({ key }) => [
        key,
        renamed(key, sanitiseYarn(parsed[key], defaults[key])),
      ])
    );
  } catch {
    return defaults;
  }
};

export const writeYarns = (yarns: YarnChoices): void => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(yarns));
  } catch {
    // A preference that cannot be saved is not worth interrupting anyone over.
  }
};

export const clearYarns = (): void => {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do.
  }
};

/** How a stitch of this pattern colour should be shown. */
export const displayYarn = (colour: RGB, yarns: YarnChoices): Yarn => {
  const key = yarnKey(colour);
  return (
    yarns[key] ?? {
      name: `rgb(${key})`,
      colour,
    }
  );
};

export const cssColour = (colour: RGB): string =>
  `rgb(${channel(colour[0])},${channel(colour[1])},${channel(colour[2])})`;
