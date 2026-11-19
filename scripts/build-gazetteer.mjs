/**
 * Builds src/data/gazetteer.json, the places the place search knows, from
 * Wikidata (https://www.wikidata.org), whose data is CC0: free to use with
 * no credit owed. It takes every human settlement of 5,000 people or more,
 * every capital of a country or of a country's first-level region whatever
 * its size, and every settlement there is in a country or territory with few
 * towns - Svalbard, the Falklands, the Pacific's islands - so the far places
 * a hat might be centred on are there too. Each is named with its first-level
 * region (state, province, nation) and its country.
 *
 *   node scripts/build-gazetteer.mjs [--zones] [--cache dir]
 *
 * With --zones it also writes src/data/zone-places.json: each IANA time
 * zone's biggest place, worked out with geo-tz, for a sky with nowhere chosen
 * yet to start from. --cache keeps each answer from Wikidata in a folder, so
 * a second run asks for nothing it already has.
 *
 * It asks the Wikidata Query Service one country at a time, and takes a few
 * minutes. The output is committed, so building the site needs none of this.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const zonesWanted = args.includes("--zones");
const cacheAt = args.includes("--cache") ? args[args.indexOf("--cache") + 1] : undefined;
if (cacheAt) mkdirSync(cacheAt, { recursive: true });

const endpoint = "https://query.wikidata.org/sparql";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One SPARQL query's rows, retried when the service is busy, cached when asked. */
const ask = async (query) => {
  const key = createHash("sha1").update(query).digest("hex");
  const cached = cacheAt && `${cacheAt}/${key}.json`;
  if (cached && existsSync(cached)) return JSON.parse(readFileSync(cached, "utf8"));
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${endpoint}?${new URLSearchParams({ query })}`, {
      headers: { Accept: "application/sparql-results+json", "User-Agent": "gazetteer-build-script/1.0" },
    });
    if (response.ok) {
      const rows = (await response.json()).results.bindings;
      if (cached) writeFileSync(cached, JSON.stringify(rows));
      await sleep(400);
      return rows;
    }
    if (response.status === 429 || response.status >= 500) {
      // 500 is how a query that ran out of time comes back: the caller splits it.
      if (response.status === 500) throw new Error("timeout");
      await sleep(5000 * (attempt + 1));
      continue;
    }
    throw new Error(`${response.status} ${await response.text()}`);
  }
  throw new Error("Wikidata kept saying it was busy");
};

const id = (uri) => uri.slice(uri.lastIndexOf("/") + 1);
const value = (row, name) => row[name]?.value;

// What counts as a settlement: anything that is a kind of human settlement.
const settlementKinds = new Set(
  (await ask("SELECT ?kind WHERE { ?kind wdt:P279* wd:Q486972 }")).map((row) => id(value(row, "kind"))),
);
console.log(`${settlementKinds.size} kinds of settlement`);

// The countries: every one a sizeable place is in, and every one with an ISO code.
const countryRows = await ask(`SELECT ?country ?code ?label (COUNT(DISTINCT ?place) AS ?places) WHERE {
  { ?place wdt:P1082 ?population. FILTER(?population >= 5000) ?place wdt:P17 ?country. }
  UNION { ?country wdt:P297 ?anyCode. }
  OPTIONAL { ?country wdt:P297 ?code. }
  OPTIONAL { ?country rdfs:label ?label. FILTER(LANG(?label) = "en") }
} GROUP BY ?country ?code ?label`);
const countries = new Map();
for (const row of countryRows) {
  const country = id(value(row, "country"));
  if (!countries.has(country)) countries.set(country, { code: value(row, "code"), label: value(row, "label"), places: Number(value(row, "places")) });
}
console.log(`${countries.size} countries and territories`);

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
// Names a reader looks for, where the standard one is longer or official.
const shorter = {
  US: "United States", GB: "United Kingdom", KR: "South Korea", KP: "North Korea", RU: "Russia",
  CD: "DR Congo", CG: "Congo", TR: "Turkey", CN: "China", AQ: "Antarctica",
};
const countryName = (country) => {
  const { code, label } = countries.get(country) ?? {};
  if (code && shorter[code]) return shorter[code];
  if (code) {
    try {
      const name = regionNames.of(code);
      if (name && name !== code) return name;
    } catch {
      // Not a code Intl knows: use Wikidata's name.
    }
  }
  return (label ?? country).replace(/^Kingdom of the /, "").replace(/^Kingdom of /, "").replace(/^People's Republic of /, "");
};

/** The settlements of a country with a population between two bounds, splitting the range if it is too much for one query. */
const settlementsIn = async (country, from, to = Infinity) => {
  const upper = Number.isFinite(to) ? ` && ?population < ${to}` : "";
  try {
    return await ask(`SELECT ?place (MAX(?population) AS ?people) (SAMPLE(?at) AS ?where)
      (GROUP_CONCAT(DISTINCT ?kind) AS ?kinds) (SAMPLE(?en) AS ?name) (SAMPLE(?mul) AS ?anyName)
      (GROUP_CONCAT(DISTINCT ?parent) AS ?parents) WHERE {
      ?place wdt:P17 wd:${country}; wdt:P1082 ?population. FILTER(?population >= ${from}${upper})
      ?place wdt:P31 ?kind; wdt:P625 ?at.
      OPTIONAL { ?place rdfs:label ?en. FILTER(LANG(?en) = "en") }
      OPTIONAL { ?place rdfs:label ?mul. FILTER(LANG(?mul) = "mul") }
      OPTIONAL { ?place wdt:P131 ?parent }
    } GROUP BY ?place`);
  } catch (error) {
    if (error.message !== "timeout" || (Number.isFinite(to) && to - from < 2000)) throw error;
    const middle = Number.isFinite(to) ? Math.round((from + to) / 2) : from * 4;
    console.log(`  splitting ${country} at ${middle}`);
    return [...(await settlementsIn(country, from, middle)), ...(await settlementsIn(country, middle, to))];
  }
};

/** Settlements with no population given, or any, for the countries with few towns. */
const everySettlementIn = (country) =>
  ask(`SELECT ?place (MAX(?population) AS ?people) (SAMPLE(?at) AS ?where)
    (GROUP_CONCAT(DISTINCT ?kind) AS ?kinds) (SAMPLE(?en) AS ?name) (SAMPLE(?mul) AS ?anyName)
    (GROUP_CONCAT(DISTINCT ?parent) AS ?parents) WHERE {
    ?place wdt:P17 wd:${country}; wdt:P31 ?kind; wdt:P625 ?at.
    OPTIONAL { ?place wdt:P1082 ?population }
    OPTIONAL { ?place rdfs:label ?en. FILTER(LANG(?en) = "en") }
    OPTIONAL { ?place rdfs:label ?mul. FILTER(LANG(?mul) = "mul") }
    OPTIONAL { ?place wdt:P131 ?parent }
  } GROUP BY ?place LIMIT 3000`);

/** The capitals of a country and of its first-level regions, whatever their size. */
const capitalsOf = (country) =>
  ask(`SELECT ?place (MAX(?population) AS ?people) (SAMPLE(?at) AS ?where)
    (GROUP_CONCAT(DISTINCT ?kind) AS ?kinds) (SAMPLE(?en) AS ?name) (SAMPLE(?mul) AS ?anyName)
    (GROUP_CONCAT(DISTINCT ?parent) AS ?parents) WHERE {
    { wd:${country} wdt:P36 ?place. } UNION { wd:${country} wdt:P150 ?region. ?region wdt:P36 ?place. }
    ?place wdt:P31 ?kind; wdt:P625 ?at.
    OPTIONAL { ?place wdt:P1082 ?population }
    OPTIONAL { ?place rdfs:label ?en. FILTER(LANG(?en) = "en") }
    OPTIONAL { ?place rdfs:label ?mul. FILTER(LANG(?mul) = "mul") }
    OPTIONAL { ?place wdt:P131 ?parent }
  } GROUP BY ?place`);

const places = new Map();
const keep = (row, country) => {
  const place = id(value(row, "place"));
  if (places.has(place)) return;
  const kinds = (value(row, "kinds") ?? "").split(" ").filter(Boolean).map(id);
  if (!kinds.some((kind) => settlementKinds.has(kind))) return;
  const at = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(value(row, "where") ?? "");
  if (!at) return;
  const longitude = Number(at[1]);
  const latitude = Number(at[2]);
  if (!(Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180)) return;
  places.set(place, {
    place,
    country,
    name: value(row, "name") ?? value(row, "anyName"),
    population: Number(value(row, "people") ?? 0),
    latitude,
    longitude,
    parents: (value(row, "parents") ?? "").split(" ").filter(Boolean).map(id),
  });
};

const ordered = [...countries.entries()].sort((a, b) => b[1].places - a[1].places);
let done = 0;
for (const [country] of ordered) {
  const before = places.size;
  for (const row of await settlementsIn(country, 5000)) keep(row, country);
  for (const row of await capitalsOf(country)) keep(row, country);
  // A country or territory of today, with few towns: every settlement in it. (Historical states have no ISO code.)
  if (places.size - before < 12 && countries.get(country).code) {
    for (const row of await everySettlementIn(country)) keep(row, country);
  }
  done += 1;
  if (done % 20 === 0 || places.size - before > 2000) console.log(`${done}/${ordered.length} ${countryName(country)}: ${places.size} places`);
}

// Names for those with neither an English nor a multilingual one, from the languages most likely to have one in Latin letters.
const unnamed = [...places.values()].filter((place) => !place.name);
for (let start = 0; start < unnamed.length; start += 300) {
  const batch = unnamed.slice(start, start + 300);
  const rows = await ask(`SELECT ?place ?label ?lang WHERE {
    VALUES ?place { ${batch.map((place) => `wd:${place.place}`).join(" ")} }
    ?place rdfs:label ?label. BIND(LANG(?label) AS ?lang)
    FILTER(?lang IN ("en-gb", "en-us", "fr", "es", "de", "pt", "it", "nl", "pl", "sv", "id", "tr", "vi", "ms", "ro", "cs"))
  }`);
  const order = ["en-gb", "en-us", "fr", "es", "de", "pt", "it", "nl", "pl", "sv", "id", "tr", "vi", "ms", "ro", "cs"];
  for (const row of rows) {
    const place = places.get(id(value(row, "place")));
    const rank = order.indexOf(value(row, "lang"));
    if (place && (place.rank === undefined || rank < place.rank)) {
      place.name = value(row, "label");
      place.rank = rank;
    }
  }
}
for (const [key, place] of places) if (!place.name) places.delete(key);

/*
 * Each place's first-level region: up its "located in" chain to the last
 * place before its country. Asked a level at a time for the places not yet
 * placed, a few hundred at once.
 */
const up = new Map();
const labels = new Map();
let asking = new Set([...places.values()].flatMap((place) => place.parents));
for (let level = 0; level < 10 && asking.size > 0; level++) {
  const ids = [...asking].filter((one) => !up.has(one));
  asking = new Set();
  for (let start = 0; start < ids.length; start += 300) {
    const batch = ids.slice(start, start + 300);
    const rows = await ask(`SELECT ?x ?up ?label WHERE {
      VALUES ?x { ${batch.map((one) => `wd:${one}`).join(" ")} }
      OPTIONAL { ?x wdt:P131 ?up }
      OPTIONAL { ?x rdfs:label ?label. FILTER(LANG(?label) = "en") }
    }`);
    for (const one of batch) up.set(one, []);
    for (const row of rows) {
      const x = id(value(row, "x"));
      const parent = value(row, "up") && id(value(row, "up"));
      if (parent && !up.get(x).includes(parent)) up.get(x).push(parent);
      if (value(row, "label")) labels.set(x, value(row, "label"));
      if (parent && !up.has(parent) && !countries.has(parent)) asking.add(parent);
    }
  }
  console.log(`regions, level ${level + 1}: ${up.size} known`);
}

const regionOf = (place) => {
  // Walk up from each parent until the next step is the country, or there is none.
  for (const start of place.parents) {
    let at = start;
    const seen = new Set();
    while (at && !seen.has(at)) {
      seen.add(at);
      if (at === place.country) return undefined;
      const next = (up.get(at) ?? []).filter((parent) => !seen.has(parent));
      if (next.length === 0 || next.includes(place.country) || next.some((parent) => countries.has(parent))) {
        return labels.get(at);
      }
      at = next[0];
    }
  }
  return undefined;
};

const fold = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const round = (number) => Math.round(number * 100) / 100;

const regions = [];
const regionIndex = new Map();
const kept = [];
const near = new Map();
const sorted = [...places.values()].sort((a, b) => b.population - a.population || a.name.localeCompare(b.name));
for (const place of sorted) {
  const country = countryName(place.country);
  const first = regionOf(place);
  const region = first && first !== place.name && first !== country && fold(first) !== fold(place.name) ? `${first}, ${country}` : country;
  // A town and the municipality of the same name, both settlements, are one place: the bigger is kept.
  const key = `${fold(place.name)}|${region}`;
  const twins = near.get(key) ?? [];
  if (twins.some((twin) => Math.abs(twin.latitude - place.latitude) < 0.3 && Math.abs(twin.longitude - place.longitude) < 0.3)) continue;
  twins.push(place);
  near.set(key, twins);
  if (!regionIndex.has(region)) {
    regionIndex.set(region, regions.length);
    regions.push(region);
  }
  kept.push([place.name, regionIndex.get(region), round(place.latitude), round(place.longitude)]);
}

const out = new URL("../src/data/", import.meta.url);
writeFileSync(new URL("gazetteer.json", out), JSON.stringify({ regions, places: kept }));
console.log(`${kept.length} places in ${regions.length} regions`);

if (zonesWanted) {
  const { find } = await import("geo-tz");
  const zones = {};
  for (const [name, region, latitude, longitude] of kept) {
    for (const zone of find(latitude, longitude)) {
      if (!zones[zone]) zones[zone] = [name, regions[region], latitude, longitude];
    }
  }
  writeFileSync(new URL("zone-places.json", out), JSON.stringify(zones));
  console.log(`${Object.keys(zones).length} time zones`);
}
