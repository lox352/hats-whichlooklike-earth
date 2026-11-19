import React, { useCallback, useMemo, useState } from "react";
import type { Stitch as HatStitch } from "../types/Stitch";
import type { HatReading } from "../knitting/useHatKnitting";
import { hatPiece } from "../knitting/hat-knitting";
import { hatStitchNotes } from "../knitting/notes";
import { placeOverlay, regionAt } from "../knitting/places";
import Chart from "../ui/chart/Chart";
import type { ChartOverlay } from "../ui/chart/chart-painter";
import { PlaceNote } from "./Places";

/** A colour from the stylesheet, as the canvas needs it. */
const token = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/**
 * A hat's chart: Sweat Shop's chart of the knitting, every stitch over the
 * stitches it was knitted into, and on this site a stitch tapped says where
 * on Earth it lands, lighting up every stitch of that place.
 *
 * Given an overlay of its own - your time, painted over it - that takes the
 * place of the place, and so does what it says of a stitch tapped.
 */
const HatChart: React.FC<{
  hat: HatStitch[];
  reading: HatReading;
  progress: number;
  follow?: boolean;
  followAt?: number;
  onJump?: (progress: number) => void;
  overlay?: ChartOverlay;
  pickerNote?: (id: number) => React.ReactNode;
}> = ({ hat, reading, progress, follow, followAt, onJump, overlay, pickerNote }) => {
  const { knitting, stitches, rounds, layout, palette, names, whats } = reading;
  const [picked, setPicked] = useState<number>();
  const place = picked === undefined ? undefined : regionAt(hat, knitting, picked);
  const paper = useMemo(() => token("--paper", "#f4efe4"), []);
  const lit = useMemo(() => (place ? placeOverlay(hat, knitting, place, paper) : undefined), [place, hat, knitting, paper]);
  const placeNote = useCallback(
    (id: number) => <PlaceNote hat={hat} regionKey={regionAt(hat, knitting, id)} />,
    [hat, knitting],
  );
  return (
    <Chart
      stitches={stitches}
      rounds={rounds}
      layout={layout}
      palette={palette}
      progress={progress}
      follow={follow}
      followAt={followAt}
      onJump={onJump}
      labels={whats}
      names={names}
      stitchNotes={hatStitchNotes}
      pieces={[hatPiece]}
      kinds={knitting.roundKinds}
      roundPieces={knitting.roundPieces}
      overlay={overlay ?? lit}
      onPicked={overlay ? undefined : setPicked}
      pickerNote={pickerNote ?? placeNote}
    />
  );
};

export default HatChart;
