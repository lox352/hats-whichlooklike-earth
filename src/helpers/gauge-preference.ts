import { defaultGauge, Gauge, isValidGauge } from "./sizing";

/**
 * The knitter's gauge, remembered between visits.
 *
 * Gauge belongs to the person and their yarn, not to the hat, so it is a local
 * preference rather than part of the design. A shared design reproduces the
 * same stitch count either way; the recipient's own gauge is what tells them
 * how big that comes out for them.
 */

const storageKey = "gauge-preference";

export const readGauge = (): Gauge => {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return defaultGauge;
    const parsed = JSON.parse(stored) as Partial<Gauge>;
    const gauge = {
      stitchesPer10cm: Number(parsed.stitchesPer10cm),
      rowsPer10cm: Number(parsed.rowsPer10cm),
    };
    return isValidGauge(gauge) ? gauge : defaultGauge;
  } catch {
    return defaultGauge;
  }
};

export const writeGauge = (gauge: Gauge): void => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(gauge));
  } catch {
    // A preference that cannot be saved is not worth interrupting anyone over.
  }
};
