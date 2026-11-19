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
/*
 * Less what counts as a settlement in Wikidata but is no place to look for:
 * a metropolitan area, an urban area, a capital region. Named one by one,
 * and only as a place's own kinds: Wikidata's tree of kinds has "city in the
 * United States" under "urban area" by some path, so what is below these
 * would take New York with it.
 */
const areaKinds = new Set([
  "Q1907114", "Q2342385", "Q702492", "Q3175539", "Q1768043", "Q3270419", "Q1062177", "Q5951278",
  "Q104774075", "Q104774089", "Q1132300", "Q2578201", "Q3201456", "Q3931970", "Q4056979",
  "Q113379906", "Q11643604", "Q11962746", "Q5124028", "Q244793", "Q7899896",
]);
// And the ones named for being one, whatever kind they are given.
const areaName = /(metropolitan area|metropolitan region|metropolitan statistical area|urban area|urban agglomeration|agglomeration|conurbation|urban corridor)$|^metropolitan |\sRegion$/i;
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
  // A settlement of some kind other than an area's.
  if (!kinds.some((kind) => settlementKinds.has(kind) && !areaKinds.has(kind))) return;
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

/** Everything Wikidata says of one country's settlements, asked four countries at a time; kept in order after. */
const rowsOf = async (country) => {
  const sizeable = await settlementsIn(country, 5000);
  // Capitals and small places are extras: a query for them that fails costs those, not the run.
  const extra = (rows) => rows.catch((error) => {
    console.log(`  ${country}: ${error.message}`);
    return [];
  });
  const capitals = await extra(capitalsOf(country));
  const few = new Set([...sizeable, ...capitals].map((row) => value(row, "place"))).size < 12;
  // A country or territory of today, with few towns: every settlement in it. (Historical states have no ISO code.)
  const every = few && countries.get(country).code ? await extra(everySettlementIn(country)) : [];
  return [...sizeable, ...capitals, ...every];
};
const answers = new Array(ordered.length);
let next = 0;
let done = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < ordered.length) {
      const at = next++;
      answers[at] = await rowsOf(ordered[at][0]);
      done += 1;
      if (done % 25 === 0) console.log(`${done}/${ordered.length} countries asked`);
    }
  }),
);
ordered.forEach(([country], at) => {
  for (const row of answers[at]) keep(row, country);
});
console.log(`${places.size} settlements`);

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
for (const [key, place] of places) if (!place.name || areaName.test(place.name)) places.delete(key);
// "Greater" a place in the same country, and bigger than it, is the place and its suburbs: the place is kept, not both.
{
  const biggest = new Map();
  for (const place of places.values()) {
    const key = `${place.country}|${place.name}`;
    biggest.set(key, Math.max(biggest.get(key) ?? 0, place.population));
  }
  for (const [key, place] of places) {
    const core = /^Greater (.+)$/.exec(place.name)?.[1];
    const coreSize = core && biggest.get(`${place.country}|${core}`);
    if (coreSize !== undefined && coreSize !== null && place.population >= coreSize) places.delete(key);
  }
}

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

// A country or territory of today: one with an ISO code. Wikidata has a few places "in" a state as their country.
const nation = (entity) => Boolean(countries.get(entity)?.code);
// A level some countries have between their regions and themselves, which no one names a place by.
const between = /^(metropolitan|mainland|continental) /i;

/** The entity a place's first-level region is: the last before its country, or a territory of it. */
const regionEntityOf = (place) => {
  // Walk up from each parent until the next step is the country, or a territory of it, or there is none.
  for (const start of place.parents) {
    let at = start;
    let below;
    const seen = new Set();
    while (at && !seen.has(at)) {
      seen.add(at);
      if (at === place.country) return undefined;
      if (nation(at)) return at;
      const next = (up.get(at) ?? []).filter((parent) => !seen.has(parent));
      const territory = next.find((parent) => parent !== place.country && nation(parent));
      if (territory) return territory;
      if (next.length === 0 || next.includes(place.country)) {
        const name = labels.get(at);
        return name && between.test(name) && below ? below : at;
      }
      below = at;
      at = next[0];
    }
  }
  return undefined;
};

// Names for the regions that came without one in English.
const regionEntities = new Map([...places.values()].map((place) => [place.place, regionEntityOf(place)]));
const nameless = [...new Set(regionEntities.values())].filter((entity) => entity && !nation(entity) && !labels.has(entity));
for (let start = 0; start < nameless.length; start += 300) {
  const batch = nameless.slice(start, start + 300);
  const rows = await ask(`SELECT ?x ?label ?lang WHERE {
    VALUES ?x { ${batch.map((one) => `wd:${one}`).join(" ")} }
    ?x rdfs:label ?label. BIND(LANG(?label) AS ?lang) FILTER(?lang IN ("en", "mul", "en-gb", "en-us"))
  }`);
  for (const row of rows) if (!labels.has(id(value(row, "x")))) labels.set(id(value(row, "x")), value(row, "label"));
}
console.log(`${nameless.length} regions named afresh`);

const regionOf = (place) => {
  const entity = regionEntities.get(place.place);
  if (!entity) return undefined;
  return nation(entity) ? countryName(entity) : labels.get(entity);
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
  // One of each name in a region, the biggest: two the search showed alike could not be told apart, and a town and its municipality are one place.
  const key = `${fold(place.name)}|${region}`;
  if (near.has(key)) continue;
  near.set(key, true);
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
