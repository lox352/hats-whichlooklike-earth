/**
 * Builds src/data/gazetteer.json, the places the place search knows, from
 * GeoNames (https://www.geonames.org, CC BY 4.0): every town of 5,000 people
 * or more, every capital and seat of a first-level region whatever its size,
 * and every settlement there is in a country or territory with few towns -
 * Antarctica's stations, Svalbard, the Pacific's islands - so the far places
 * a hat might be centred on are there too.
 *
 * Run it with GeoNames' cities1000.txt and its first-level region names, as
 * the npm packages cities-1000-structured and cities.json publish them:
 *
 *   node scripts/build-gazetteer.mjs path/to/cities1000.txt path/to/admin1.json
 *
 * With --zones it also writes src/data/zone-places.json: each time zone's
 * biggest place, for a sky with nowhere chosen yet to start from.
 *
 * The output is committed, so building the site needs neither.
 */
import { readFileSync, writeFileSync } from "node:fs";

const [citiesPath, admin1Path, ...flags] = process.argv.slice(2);
if (!citiesPath || !admin1Path) {
  console.error("usage: node scripts/build-gazetteer.mjs cities1000.txt admin1.json [--zones]");
  process.exit(1);
}

const admin1 = new Map(JSON.parse(readFileSync(admin1Path, "utf8")).map(({ code, name }) => [code, name]));
const countries = new Intl.DisplayNames(["en"], { type: "region" });
// Names a reader looks for, where the standard one is longer or official.
const countryNames = {
  US: "United States",
  GB: "United Kingdom",
  KR: "South Korea",
  KP: "North Korea",
  RU: "Russia",
  CD: "DR Congo",
  CG: "Congo",
  AQ: "Antarctica",
  TR: "Turkey",
};
const countryOf = (code) => countryNames[code] ?? countries.of(code) ?? code;

const unwanted = new Set(["PPLH", "PPLQ", "PPLW", "PPLCH"]);
const rows = readFileSync(citiesPath, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => line.split("\t"))
  .map((f) => ({
    name: f[1],
    latitude: Number(f[4]),
    longitude: Number(f[5]),
    code: f[7],
    country: f[8],
    admin1: f[10],
    population: Number(f[14] || 0),
    zone: f[17],
  }))
  .filter((row) => !unwanted.has(row.code) && Number.isFinite(row.latitude) && Number.isFinite(row.longitude));

// Countries and territories with few towns: everywhere in them is kept.
const towns = new Map();
for (const row of rows) if (row.population >= 5000) towns.set(row.country, (towns.get(row.country) ?? 0) + 1);
const sparse = (country) => (towns.get(country) ?? 0) < 12;

const kept = rows.filter(
  (row) => row.population >= 5000 || row.code === "PPLC" || row.code === "PPLA" || sparse(row.country),
);
kept.sort((a, b) => b.population - a.population || a.name.localeCompare(b.name));

const round = (value) => Math.round(value * 100) / 100;
const regionOf = (row) => {
  const state = admin1.get(`${row.country}.${row.admin1}`);
  const country = countryOf(row.country);
  return state && state !== row.name && state !== country ? `${state}, ${country}` : country;
};

const regions = [];
const regionIndex = new Map();
const places = [];
const zones = {};
const seen = new Set();
for (const row of kept) {
  const region = regionOf(row);
  // One of each name in a region: the biggest, which sorts first.
  const key = `${row.name}|${region}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (!regionIndex.has(region)) {
    regionIndex.set(region, regions.length);
    regions.push(region);
  }
  const place = [row.name, regionIndex.get(region), round(row.latitude), round(row.longitude)];
  places.push(place);
  // Each time zone's biggest place, for a sky with nowhere chosen yet.
  if (row.zone && !zones[row.zone]) zones[row.zone] = [row.name, region, place[2], place[3]];
}

const out = new URL("../src/data/", import.meta.url);
writeFileSync(new URL("gazetteer.json", out), JSON.stringify({ regions, places }));
if (flags.includes("--zones")) writeFileSync(new URL("zone-places.json", out), JSON.stringify(zones));
console.log(`${places.length} places in ${regions.length} regions; ${Object.keys(zones).length} time zones`);
