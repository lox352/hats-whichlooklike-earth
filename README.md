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
coordinate as the colour, at the same moment, so the two cannot disagree about
where a stitch is.

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
  check it against the source polygons at six thousand points. Countries
  smaller than a cell - Malta, Monaco, the Maldives - are not on it, and the
  ragged margin the marine layer leaves along Antarctica is settled by
  nearness. Where the picture and the label disagree it is at a coastline, or
  over an ice shelf, where a stitch is white because the shelf is and labelled
  with the sea beneath it.
- Sibling branches build the same machinery for different subjects: `space`
  (star charts) and `pictures`.
