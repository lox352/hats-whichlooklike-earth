# Hats Which Look Like Earth

Design a knitted hat that looks like the Earth, and get a chart you can actually
knit from. Live at [hats.whichlooklike.earth](https://hats.whichlooklike.earth).

## How it works

The interesting part is that the colourwork is not drawn — it is *derived*, by
simulating the hat as a physical object and then asking where each stitch ended
up on the globe.

1. **Design** (`src/components/Design.tsx`) — choose a stitch count, a row
   count, a decrease method, and which point on Earth should land on which part
   of the hat.
2. **Knit** (`src/types/KnittingMachine.ts`) — a virtual knitting machine casts
   on, joins the round, knits the body and works the decreases, emitting a
   `Stitch[]` where each stitch records the stitches it was knitted into. The
   knitting is a helix, not a stack of closed rings, so rows wrap at a seam.
3. **Settle** (`src/ChainModel/`) — every stitch becomes a Rapier rigid body,
   linked to its neighbours by rope joints. Gravity points *up*, so the tube
   relaxes into a hat shape.
4. **Dye** (`src/helpers/node-colouring.ts`) — once the simulation comes to
   rest, each stitch's resting position is converted to a latitude/longitude,
   rotated so the user's chosen point lands where they asked, and sampled
   against an equirectangular raster of the Earth. The sampled colour is
   snapped to the nearest of four yarn colours.
5. **Chart** (`src/helpers/pattern-layout.ts`) — the tube is flattened into a
   grid, with decrease symbols, and can be saved and ticked off row by row.

The projection is deliberately in two halves: spherical above the hat's
equator, cylindrical below it, so the map continues down the sides rather than
pinching at the brim.

The same pass also records *where* each stitch landed - the country or ocean
under its centre - so the chart can outline a place and name it, and knitting
mode can say what you are working through. The label is read from the same
coordinate as the colour, at the same moment, and from a grid built so that a
land region falls only on land-coloured stitches and a water region only on
the ocean blue. A blue stitch is always named as water and a green one always
as land.

## The knitting machinery

Everything that reads a pattern while it is knitted is
[Sweat Shop](https://github.com/lox352/sweat-shop)'s, which grew out of this
site and took it a long way further for jumpers. It is copied in, file for
file, so it can be copied in again as it moves on:

| Folder | What it is |
| --- | --- |
| `src/pattern/` | A stitch and the table of the kinds of stitch and step, which everything reads. |
| `src/reading/` | What is read off the knitting: the chart's layout, the rounds as counted, runs, the key, yardage. |
| `src/ui/chart/` | The chart: painted on canvas tiles, columns no stitch in view needs closed up, pinch to zoom, gliding after the stitch, a tapped stitch's bubble. |
| `src/ui/components/` | The knitting panel, the key, the time a hat has taken and has left. |
| `src/projects/` | Settings, and the knitting-time log kept from every tap. |

The hat is still made, settled and dyed as it always was. `src/knitting/`
is where the two meet: `hat-knitting.ts` reads a hat's stitches as Sweat
Shop reads a jumper's - the cast-on cast on and the join a step of its own
after it, the double decrease the s2kp it always was, rounds counted from
the cast-on as the chart has always numbered its rows, so a stitch stands
exactly where it did on a chart printed before, each yarn a slot letter -
and the rest of `src/knitting/` is
the hat's own: its yarns (`yarns.ts`), what it says of its stitches
(`notes.ts`), the places its stitches land on (`places.ts`), its wool, the
chart as printed.

Saved patterns are on version 4, which counts progress in those ids, with
the join a step; older ones are moved on as they are read.

What changed in the copied files, to look for when copying them in again:
`reading/palette.ts` imports `RGB` from `types/`; `ui/chart/Chart.tsx` tells
an `onPicked` of the stitch tapped and opens at a `startZoom`;
`ui/chart/chart-painter.ts` can draw `lines` between stitches over the chart,
and an `outline` round a set of them; `ui/components/KnittingPanel.tsx`
takes a `where` and a `finishing`, and says nothing of the middle of the
back; the stylesheets use this site's names for the type scale and colours.

The pages:

| Address | What it is |
| --- | --- |
| `/pattern/:id` | A saved hat: its progress and the chart at the needle, its time and its wool. |
| `/pattern/:id/chart` | The chart, filling the screen. With `?knitting=1` the knitting panel is open; with `?stats=1`, your time is painted over it. |

## Running it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the production build |

## Deployment

Pushing to the `earth` branch triggers `.github/workflows/deploy.yml`, which
builds and publishes to the `gh-pages` branch. **A push to `earth` is a
production deploy.**

## Notes

- Saved patterns live in `localStorage` on the device that made them. All
  reads and writes go through `src/helpers/pattern-storage.ts`, which versions
  the stored shape and migrates older entries on read, so a corrupt or
  outdated entry cannot break the pages that list them.
- The globe is tiled into countries and oceans, so every stitch is in exactly
  one. The tiling is burned ahead of time onto the same 1080x540 grid the
  globe raster is sampled from (`src/assets/region-labels.rle`), from Natural
  Earth's admin-0 countries at 1:50m and its marine polygons at 1:110m, both
  public domain; `scripts/region-reference.py` regenerates it, and the tests
  check it against the source polygons at six thousand points.
- Every region is then made to be the kind of place its cell is painted. The
  map and the photograph disagreed about one cell in forty - coastlines half a
  cell out, the Antarctic ice shelves floating on sea but painted as ice, the
  Arctic pack white over water - and where they did, the photograph won and the
  cell took the nearest region of the kind it looks like. So the Ross Ice Shelf
  is Antarctica rather than the Ross Sea, and the Great Lakes are the United
  States, because that is the wool they are knitted in.
  `src/helpers/earth-regions-wool.test.ts` checks this at all 583,200 cells.
- The cost is that a place too small for the raster to paint is not on the hat
  to be named. Hawaii, Singapore, Malta and the Maldives all average into the
  sea around them at a third of a degree, so a stitch there is knitted blue and
  called by the ocean it is knitted as. Sixty-eight countries are in that
  position.
- Sibling branches build the same machinery for different subjects: `space`
  (star charts) and `pictures`.
