import { bareIdFor, knittingParam } from "../helpers/pattern-storage";

/** Marks a chart page's address as open on your time. */
export const statsParam = "stats";

/** A saved hat's page, and its chart, filling the screen: with `knitting`, open on the knitting panel. */
export const patternPath = (id: string) => `/pattern/${bareIdFor(id)}`;
export const chartPath = (id: string, knitting = false) =>
  `/pattern/${bareIdFor(id)}/chart${knitting ? `?${knittingParam}=1` : ""}`;

/** "Under 1%", "3%": how far through, never rounded up to done. */
export const percentKnitted = (worked: number, percent: number) =>
  `${worked > 0 && percent < 1 ? "Under 1" : Math.floor(percent)}%`;
