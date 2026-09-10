import { Place, places } from "../data/places";

/**
 * Substring search over the bundled gazetteer.
 *
 * Small enough (a couple of hundred entries) that a linear scan per keystroke
 * is not worth optimising. Accents are folded, so "Sao Paulo" finds
 * "São Paulo" and vice versa.
 */

const fold = (value: string): string =>
  value
    .normalize("NFD")
    // Strip combining marks, so e -> e and o -> o.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

interface Indexed {
  place: Place;
  name: string;
  region: string;
}

const index: Indexed[] = places.map((place) => ({
  place,
  name: fold(place.name),
  region: fold(place.region),
}));

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
  const folded = fold(query);
  if (folded.length === 0) return [];

  const matches: { entry: Indexed; rank: number }[] = [];
  for (const entry of index) {
    const rank = score(entry, folded);
    if (rank !== null) matches.push({ entry, rank });
  }

  return matches
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.entry.name.length - b.entry.name.length ||
        a.entry.name.localeCompare(b.entry.name)
    )
    .slice(0, limit)
    .map((match) => match.entry.place);
};

export type { Place };
