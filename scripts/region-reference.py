"""Regenerate the region-label reference data.

Optional; the outputs are committed. Needs `pip install numpy pillow`.

The globe is tiled: every point on it is inside exactly one country or one
named body of water, so every stitch of a charted hat is in exactly one
region. This burns that tiling onto the same 1080x540 grid the colour is
sampled from, so a stitch's label and its colour are two readings of one
atlas rather than two guesses from different sources.

Three outputs:

  src/assets/region-labels.rle          the grid, run-length encoded
  src/data/region-names.ts              what to call each region
  src/helpers/__fixtures__/earth-regions.json   reference points for the tests

A region is then only allowed to be the kind of place its cell is painted:
land regions land exactly on the stitches knitted in a land colour, and water
regions exactly on the ones knitted in the ocean blue. The map and the
photograph disagree in about one cell in forty - along coastlines, over the
Antarctic ice shelves, which float on sea but are painted as ice, and over the
Arctic pack - and where they do, the photograph wins and the cell is given the
nearest region of the kind it looks like. It is the wool that a knitter can
see, so it is the wool that decides.

Countries come from Natural Earth at 1:50m and the water from the marine
layer at 1:110m. The grid is a fixed size, so the finer country data costs
nothing on disk or over the wire - only the time this script takes - and it
is what puts Hawaii, Iceland's real outline and the Pacific island states on
the hat. The marine layer stays at 110m deliberately: its 50m cousin has
non-unique names and is full of rivers, reefs and straits, which are not the
kind of place you want to be told you are knitting through.
"""
import json
import re
import unicodedata
import urllib.request
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"
countries_layer = "ne_50m_admin_0_countries"
marine_layer = "ne_110m_geography_marine_polys"

# The globe raster's own dimensions. Matching them is the whole point: see
# `sample_longitude` below.
WIDTH, HEIGHT = 1080, 540

# Natural Earth files the app for French Southern and Antarctic Lands under a
# subregion that reads as a data-entry artefact rather than a place.
SEVEN_SEAS = "Seven seas (open ocean)"

ARTICLES = {"ocean": "an ocean", "sea": "a sea", "bay": "a bay", "gulf": "a gulf"}

# Words a title-cased name leaves alone, so "Sea of Japan" does not become
# "Sea Of Japan".
MINOR_WORDS = {"of", "the", "and"}


def fetch(layer):
    url = f"{source}/{layer}.geojson"
    print(f"fetching {url}")
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read())


def slug(name):
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", ascii_name.lower())).strip("-")


def tidy(name):
    """Natural Earth shouts three of the oceans. Everything else it spells."""
    if not name.isupper():
        return name
    return " ".join(
        word.lower() if word.lower() in MINOR_WORDS else word.capitalize()
        for word in name.split()
    )


def polygons(geometry):
    kind, coordinates = geometry["type"], geometry["coordinates"]
    if kind == "Polygon":
        return [coordinates]
    if kind == "MultiPolygon":
        return coordinates
    return []


"""
The sample points.

`colourAt` in src/helpers/raster-colouring.ts picks its pixel with

    x = Math.round(((longitude + 180) / 360) * width)

which means cell `x` is the one nearest to - and so owns the longitudes
around - `-180 + x * 360 / width`, not the longitudes spanning the cell as a
floor would give. So that, and not the geometric centre of the cell, is the
point that has to be tested against the polygons. Half a cell is a sixth of a
degree; it would not matter for a colour, which is averaged over a 3x3
neighbourhood, but a label is one cell and nothing smooths it, so getting
this wrong would put every coastal label consistently to the north-west of
the coast it belongs to.
"""
sample_longitudes = -180 + np.arange(WIDTH) * 360 / WIDTH
sample_latitudes = 90 - np.arange(HEIGHT) * 180 / HEIGHT


def burn(grid, polys, value):
    """Even-odd scanline fill, writing only into cells still unassigned.

    Each ring is walked as a closed loop of edges; for every raster row the
    edges crossing that row's latitude give an even number of crossings,
    which pair up into spans of longitude that are inside the polygon. Holes
    need no special handling: an even-odd rule counts a point inside a hole
    twice and so leaves it out.
    """
    for poly in polys:
        edges = []
        for ring in poly:
            for start, end in zip(ring, ring[1:]):
                edges.append((start[0], start[1], end[0], end[1]))
        if not edges:
            continue
        edge = np.array(edges, dtype=float)
        x1, y1, x2, y2 = edge[:, 0], edge[:, 1], edge[:, 2], edge[:, 3]
        low, high = np.minimum(y1, y2).min(), np.maximum(y1, y2).max()
        rows = np.nonzero((sample_latitudes >= low) & (sample_latitudes <= high))[0]
        for row in rows:
            latitude = sample_latitudes[row]
            crossing = (y1 > latitude) != (y2 > latitude)
            if not crossing.any():
                continue
            crossings = x1[crossing] + (latitude - y1[crossing]) / (
                y2[crossing] - y1[crossing]
            ) * (x2[crossing] - x1[crossing])
            crossings.sort()
            for left, right in zip(crossings[0::2], crossings[1::2]):
                first = int(np.ceil((left + 180) * WIDTH / 360))
                last = int(np.floor((right + 180) * WIDTH / 360))
                if last < first:
                    continue
                first, last = max(first, 0), min(last, WIDTH - 1)
                span = grid[row, first : last + 1]
                span[span == 0] = value


def flood(grid, seeds):
    """Give every unassigned cell the label of the nearest assigned one.

    Breadth-first from all the seeds at once, so a cell is reached first by
    whichever label is nearest to it in the grid. The grid wraps east to west,
    as the globe does, but not over the poles.
    """
    queue = deque(zip(*(axis.tolist() for axis in np.nonzero(seeds))))
    filled = 0
    while queue:
        row, column = queue.popleft()
        value = grid[row, column]
        for down, right in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            next_row, next_column = row + down, (column + right) % WIDTH
            if next_row < 0 or next_row >= HEIGHT:
                continue
            if grid[next_row, next_column] == 0:
                grid[next_row, next_column] = value
                queue.append((next_row, next_column))
                filled += 1
    return filled


# The four yarns, from src/helpers/raster-colouring.ts. Only the first is
# water; glacier white and ice beige are things that sit on land, or on a
# shelf that is painted as though it were land.
PALETTE = [(119, 159, 196), (178, 200, 169), (233, 240, 248), (241, 231, 212)]


def painted_water():
    """Which cells the hat is knitted in the ocean blue.

    This is `colourAt` with its own arithmetic, not an approximation of it:
    the mean of the 3x3 neighbourhood, neighbours off the edge of the raster
    left out rather than wrapped, rounded per channel, then snapped to the
    nearest of the four yarns. It has to be exact, because the whole point is
    that the answer here and the answer the app computes are the same answer.
    """
    picture = np.asarray(
        Image.open(root / "src/assets/raster_globe.tif").convert("RGB")
    ).astype(float)
    height, width = picture.shape[:2]
    if (width, height) != (WIDTH, HEIGHT):
        raise SystemExit(
            f"the globe raster is {width}x{height} but the labels are {WIDTH}x{HEIGHT}"
        )

    total = np.zeros((HEIGHT, WIDTH, 3))
    count = np.zeros((HEIGHT, WIDTH))
    for down in (-1, 0, 1):
        for right in (-1, 0, 1):
            rows = slice(max(0, down), HEIGHT + min(0, down))
            columns = slice(max(0, right), WIDTH + min(0, right))
            total[rows, columns] += picture[
                rows.start - down : rows.stop - down,
                columns.start - right : columns.stop - right,
            ]
            count[rows, columns] += 1

    mean = np.round(total / count[..., None])
    yarns = np.array(PALETTE)
    nearest = ((mean[:, :, None, :] - yarns[None, None, :, :]) ** 2).sum(-1).argmin(-1)
    return nearest == 0


def reconcile(grid, water_region, wants_water):
    """Make every cell's region the kind of place the cell is painted.

    The map and the photograph are different sources and disagree about one
    cell in forty: a coastline falls half a cell out, an ice shelf floats on
    the Ross Sea but is painted as ice, the Arctic pack is white over water.
    The wool is what a knitter can see, so the wool decides, and a cell whose
    region is the wrong kind is given the nearest region of the right kind.

    Nearest by breadth-first search from all the cells that already agree, so
    a fjord painted blue takes the name of the water it opens onto and a
    shelf painted white takes the name of the land it is joined to.
    """
    kind_of = water_region[grid]
    wrong = kind_of != wants_water
    corrected = grid.copy()
    corrected[wrong] = 0

    for target in (True, False):
        # Seed from the cells of this kind that were already right, and carry
        # their region outwards across the whole grid, writing it only into
        # the cells of this kind that were wrong. Crossing cells of the other
        # kind on the way matters: a lake painted blue in the middle of a
        # continent has no water touching it at all, and would otherwise be
        # left stranded with nothing it could be called.
        seeds = (~wrong) & (wants_water == target)
        needed = wrong & (wants_water == target)
        carried = np.zeros((HEIGHT, WIDTH), dtype=np.uint16)
        carried[seeds] = grid[seeds]
        queue = deque(zip(*(axis.tolist() for axis in np.nonzero(seeds))))
        while queue:
            row, column = queue.popleft()
            value = carried[row, column]
            for down, right in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                next_row, next_column = row + down, (column + right) % WIDTH
                if next_row < 0 or next_row >= HEIGHT:
                    continue
                if carried[next_row, next_column] != 0:
                    continue
                carried[next_row, next_column] = value
                queue.append((next_row, next_column))
                if needed[next_row, next_column]:
                    corrected[next_row, next_column] = value

    if (corrected == 0).any():
        stranded = int((corrected == 0).sum())
        raise SystemExit(
            f"{stranded} cells are painted a kind of place with no region of "
            "that kind anywhere they can reach"
        )
    moved = int((corrected != grid).sum())
    print(f"moved {moved} cells to a region of the kind they are painted")
    return corrected


def inside(polys, longitude, latitude):
    """Point-in-polygon, one point at a time.

    Deliberately a different algorithm from `burn`: per-point parity rather
    than per-row spans. The fixture this writes is only worth having as a
    check on the burned grid if it was not produced by the same code.
    """
    for poly in polys:
        crossings = 0
        for ring in poly:
            for start, end in zip(ring, ring[1:]):
                x1, y1 = start[0], start[1]
                x2, y2 = end[0], end[1]
                if (y1 > latitude) != (y2 > latitude):
                    at = x1 + (latitude - y1) / (y2 - y1) * (x2 - x1)
                    if longitude < at:
                        crossings += 1
        if crossings % 2:
            return True
    return False


def main():
    countries = fetch(countries_layer)["features"]
    marine = fetch(marine_layer)["features"]

    keys = ["(unassigned)"]
    descriptions = {}
    shapes = []

    for feature in countries:
        properties = feature["properties"]
        key = properties["ADM0_A3"]
        name = properties["NAME_EN"]
        subregion = properties["SUBREGION"]
        if key in descriptions:
            raise SystemExit(f"ADM0_A3 {key} is not unique: {name}")
        if not key or key == "-99":
            raise SystemExit(f"{name} has no ADM0_A3 to key it by")
        # Antarctica's subregion is Antarctica, which would read as
        # "Antarctica, in Antarctica". An empty note is better than a silly one.
        if subregion == SEVEN_SEAS:
            where = "in the southern Indian Ocean"
        elif subregion == name:
            where = ""
        else:
            where = f"in {subregion}"
        descriptions[key] = {"name": name, "where": where, "kind": "country"}
        keys.append(key)
        shapes.append((key, polygons(feature["geometry"])))

    countries_end = len(keys) - 1

    # Seas before oceans, so an enclosed sea wins the cells of the ocean
    # polygon laid over it: the Mediterranean is more use to a knitter than
    # "North Atlantic Ocean" would be.
    for feature in sorted(marine, key=lambda f: f["properties"]["scalerank"], reverse=True):
        properties = feature["properties"]
        name = tidy(properties["name"])
        key = slug(name)
        kind = properties["featurecla"]
        if key in descriptions:
            raise SystemExit(f"marine key {key} is not unique: {name}")
        descriptions[key] = {
            "name": name,
            "where": ARTICLES.get(kind, f"a {kind}"),
            "kind": kind,
        }
        keys.append(key)
        shapes.append((key, polygons(feature["geometry"])))

    index_of = {key: i for i, key in enumerate(keys)}
    if len(keys) > 65535:
        raise SystemExit(f"{len(keys)} regions will not fit in a Uint16Array")

    grid = np.zeros((HEIGHT, WIDTH), dtype=np.uint16)
    for key, polys in shapes:
        burn(grid, polys, index_of[key])
    burned = int((grid != 0).sum())
    print(f"burned {burned} of {WIDTH * HEIGHT} cells from the polygons")

    # The marine layer does not reach every corner of the sea - there is a
    # ragged gap along the Antarctic margin - so the rest is settled by
    # nearness. Water first, seeded only from water, or the gap round
    # Antarctica would be eaten by Antarctica.
    water = grid > countries_end
    from_water = flood(grid, water)
    print(f"flood from water filled {from_water} cells")
    residue = flood(grid, grid > 0)
    print(f"second flood filled {residue} cells (waters enclosed by land)")
    if (grid == 0).any():
        raise SystemExit(f"{int((grid == 0).sum())} cells are still unassigned")
    print("the globe is tiled: every cell has exactly one region")

    # What the polygons alone said, before anything was settled by nearness.
    # The fixture is built from this so that a test never asserts one of this
    # script's own choices against the source data's silence.
    from_polygons = np.zeros((HEIGHT, WIDTH), dtype=np.uint16)
    for key, polys in shapes:
        burn(from_polygons, polys, index_of[key])

    # Now make the regions agree with the picture, cell for cell.
    water_region = np.zeros(len(keys), dtype=bool)
    for index, key in enumerate(keys):
        if index == 0:
            continue
        water_region[index] = descriptions[key]["kind"] != "country"
    wants_water = painted_water()
    disagreed = int((water_region[grid] != wants_water).sum())
    print(
        f"{disagreed} cells ({100 * disagreed / (WIDTH * HEIGHT):.2f}%) were a "
        "different kind of place from the wool they are knitted in"
    )
    grid = reconcile(grid, water_region, wants_water)
    if (water_region[grid] != wants_water).any():
        raise SystemExit("a cell is still the wrong kind of place")
    print("every cell's region is the kind of place the cell is painted")

    # Settled by nearness rather than read straight off a polygon: either a
    # flood filled it, or the picture overruled the polygon that covered it.
    derived = (from_polygons == 0) | (grid != from_polygons)

    used = sorted(set(grid.flatten().tolist()))
    print(f"{len(used)} regions occupy at least one cell, of {len(keys) - 1} in the data")
    homeless = [
        descriptions[key]["name"]
        for key in keys[1:]
        if index_of[key] not in set(used)
    ]
    if homeless:
        print(f"{len(homeless)} too small for a cell, so unlabelled: {', '.join(sorted(homeless))}")

    # Renumber to just the regions in use, so the committed key list and the
    # names table agree exactly and nothing ships that cannot be reached.
    renumbered = {old: new for new, old in enumerate(used)}
    compact = np.vectorize(renumbered.get)(grid).astype(np.uint16)
    compact_keys = [keys[old] for old in used]

    write_raster(compact, compact_keys)
    write_names(compact_keys, descriptions)
    write_fixture(compact, compact_keys, shapes, index_of, renumbered, derived)


def write_raster(grid, keys):
    flat = grid.flatten().tolist()
    runs = []
    value, length = flat[0], 0
    for cell in flat:
        if cell == value:
            length += 1
        else:
            runs.append(f"{value}:{length}")
            value, length = cell, 1
    runs.append(f"{value}:{length}")

    lines = [
        "region-labels 1",
        f"{WIDTH} {HEIGHT} {len(keys)}",
        " ".join(keys),
    ]
    line = []
    width = 0
    for run in runs:
        if width + len(run) + 1 > 100:
            lines.append(" ".join(line))
            line, width = [], 0
        line.append(run)
        width += len(run) + 1
    if line:
        lines.append(" ".join(line))

    path = root / "src/assets/region-labels.rle"
    path.write_text("\n".join(lines) + "\n")
    print(f"wrote {path.relative_to(root)}: {len(runs)} runs, {path.stat().st_size} bytes")


def write_names(keys, descriptions):
    lines = [
        "/*",
        " * What to call each region of the globe, and what to say about it.",
        " *",
        f" * Generated by scripts/region-reference.py from Natural Earth {countries_layer}",
        f" * and {marine_layer}. Only regions that occupy at least one cell of",
        " * src/assets/region-labels.rle are here, so the two files agree exactly.",
        " */",
        "",
        '/** A country, or the kind of water: the globe is land or it is sea. */',
        'export type RegionKind = "country" | "ocean" | "sea" | "bay" | "gulf";',
        "",
        "export interface RegionDescription {",
        "  /** \"France\", \"North Atlantic Ocean\". */",
        "  name: string;",
        "  /** The second clause, ready to print: \"in Western Europe\", \"an ocean\". */",
        "  where: string;",
        "  kind: RegionKind;",
        "}",
        "",
        "export const regionDescriptions: Record<string, RegionDescription> = {",
    ]
    for key in sorted(keys):
        entry = descriptions[key]
        lines.append(
            f"  {json.dumps(key)}: {{ name: {json.dumps(entry['name'])},"
            f" where: {json.dumps(entry['where'])},"
            f" kind: {json.dumps(entry['kind'])} }},"
        )
    lines += [
        "};",
        "",
        "/** The name of a region, or the key itself if it is not one we know. */",
        "export const regionName = (key: string): string =>",
        "  regionDescriptions[key]?.name ?? key;",
        "",
    ]
    path = root / "src/data/region-names.ts"
    path.write_text("\n".join(lines))
    print(f"wrote {path.relative_to(root)}: {len(keys)} regions, {path.stat().st_size} bytes")


def write_fixture(grid, keys, shapes, index_of, renumbered, derived):
    """Reference points, classified without going near the burned grid.

    Only points that are unambiguous are kept: nothing within a cell of a
    boundary, and nothing whose cell was settled by the flood rather than by
    a polygon. A test wants to catch the grid disagreeing with the source
    data, not to relitigate where the edge of the Ross Sea is.
    """
    points = []
    dropped = 0
    for row in range(2, HEIGHT - 2, 7):
        for column in range(0, WIDTH, 11):
            longitude = float(sample_longitudes[column])
            latitude = float(sample_latitudes[row])
            if derived[row, column]:
                dropped += 1
                continue
            patch = grid[row - 1 : row + 2, column - 1 : column + 2]
            if patch.size == 0 or len(set(patch.flatten().tolist())) != 1:
                dropped += 1
                continue
            hits = [key for key, polys in shapes if inside(polys, longitude, latitude)]
            if len(hits) != 1:
                dropped += 1
                continue
            points.append([longitude, latitude, hits[0]])

    result = {
        "source": (
            f"Natural Earth {countries_layer} and {marine_layer}, classified by "
            "per-point even-odd ray casting over the source GeoJSON - a different "
            "code path from the scanline fill that writes the raster. Points "
            "within a cell of a boundary, and points whose cell was settled by "
            "the flood fill rather than by a polygon, are left out."
        ),
        "dropped": dropped,
        "points": points,
    }
    path = root / "src/helpers/__fixtures__/earth-regions.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(
        f"wrote {path.relative_to(root)}: {len(points)} points over "
        f"{len({p[2] for p in points})} regions, {dropped} dropped as ambiguous"
    )


if __name__ == "__main__":
    main()
