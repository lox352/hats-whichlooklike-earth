import { HatDesign } from "../types/HatDesign";
import { Stitch } from "../types/Stitch";
import { designKey } from "./design-url";

/**
 * Remembers the dyed hat for the current design, for the length of the tab.
 *
 * Dyeing takes several seconds, so reloading the chart page should not throw
 * that away. The cache is keyed by the design, so it is only ever used for the
 * hat it was made from; anything else is a miss and the hat is re-knitted.
 */

const storageKey = "in-progress-hat";

interface CachedHat {
  key: string;
  stitches: Stitch[];
}

export const cacheDyedHat = (design: HatDesign, stitches: Stitch[]): void => {
  if (stitches.length === 0) return;
  try {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ key: designKey(design), stitches } satisfies CachedHat)
    );
  } catch {
    // Out of quota, or storage blocked. The hat can always be re-knitted, so
    // failing to cache is not worth surfacing.
  }
};

export const readDyedHat = (design: HatDesign): Stitch[] | undefined => {
  let stored: string | null;
  try {
    stored = sessionStorage.getItem(storageKey);
  } catch {
    return undefined;
  }
  if (!stored) return undefined;

  try {
    const parsed = JSON.parse(stored) as CachedHat;
    if (parsed.key !== designKey(design)) return undefined;
    if (!Array.isArray(parsed.stitches) || parsed.stitches.length === 0) {
      return undefined;
    }
    return parsed.stitches;
  } catch {
    return undefined;
  }
};

export const clearDyedHat = (): void => {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // Nothing to do.
  }
};
