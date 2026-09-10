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
- Sibling branches build the same machinery for different subjects: `space`
  (star charts) and `pictures`.
