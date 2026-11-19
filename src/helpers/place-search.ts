import { Place, places as landmarks } from "../data/places";

/**
 * Search over the places the site knows: some sixty thousand towns and cities
 * from Wikidata (see scripts/build-gazetteer), and a short hand-picked list of
 * the places that are not towns - the poles, Point Nemo, the oceans, the
 * deserts and the peaks - which also stands in while the rest load.
 *
 * The towns are a file of their own, fetched the first time anyone searches
 * (loadGazetteer), so no page is heavier for them. A linear scan of them per
 * keystroke takes a few milliseconds and is not worth an index.
 *
 * Accents are folded, so "Sao Paulo" finds "São Paulo" and vice versa. A
 * comma narrows by region: "Springfield, Illinois", "Perth, Scotland".
 */

const fold = (value: string): string =>
  value
    .normalize("NFD")
    // Strip combining marks, so é -> e and ö -> o.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

interface Indexed {
  place: Place;
  name: string;
  region: string;
  /** How well known it is: lower first. The hand-picked places, then the towns by size. */
  rank: number;
}

const indexed = (place: Place, rank: number): Indexed => ({
  place,
  name: fold(place.name),
  region: fold(place.region),
  rank,
});

let index: Indexed[] = landmarks.map((place) => indexed(place, 0));
let loading: Promise<void> | undefined;

/** Within half a degree: the same place, give or take where its centre is put. */
const near = (a: Place, b: Place) =>
  Math.abs(a.latitude - b.latitude) < 0.5 && Math.abs(a.longitude - b.longitude) < 0.5;

/**
 * Fetch the towns and search them from now on. Resolves once they are in; a
 * second call waits on the first. A hand-picked place that is a town already
 * there gives way to it, which knows its region better.
 */
export const loadGazetteer = (): Promise<void> =>
  (loading ??= import("../data/gazetteer.json").then(({ default: data }) => {
    const towns = (data.places as [string, number, number, number][]).map(([name, region, latitude, longitude], at) =>
      indexed({ name, region: data.regions[region], latitude, longitude }, at + 1),
    );
    const byName = new Map<string, Indexed[]>();
    for (const town of towns) {
      const same = byName.get(town.name);
      if (same) same.push(town);
      else byName.set(town.name, [town]);
    }
    const others = landmarks.filter((place) => !(byName.get(fold(place.name)) ?? []).some((town) => near(town.place, place)));
    index = [...others.map((place) => indexed(place, 0)), ...towns];
  }));

/** How many places a search can find, now. */
export const placesKnown = (): number => index.length;

/**
 * Lower score sorts first: an exact name, then a name that starts with the
 * query, then one that contains it, then a match only on the region.
 */
const score = (entry: Indexed, query: string): number | null => {
  if (entry.name === query) return 0;
  if (entry.name.startsWith(query)) return 1;
  // Match at a word boundary before matching mid-word.
  if (entry.name.includes(` ${query}`)) return 2;
  if (entry.name.includes(query)) return 3;
  if (entry.region.startsWith(query)) return 4;
  if (entry.region.includes(query)) return 5;
  return null;
};

export const searchPlaces = (query: string, limit = 8): Place[] => {
  const [name, ...rest] = fold(query).split(",");
  const named = name.trim();
  const within = rest.join(",").trim();
  if (named.length === 0) return [];

  const matches: { entry: Indexed; score: number }[] = [];
  for (const entry of index) {
    if (within && !entry.region.includes(within)) continue;
    const found = score(entry, named);
    if (found !== null) matches.push({ entry, score: found });
  }

  return matches
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.entry.rank - b.entry.rank ||
        a.entry.name.length - b.entry.name.length ||
        a.entry.name.localeCompare(b.entry.name)
    )
    .slice(0, limit)
    .map((match) => match.entry.place);
};

export type { Place };
